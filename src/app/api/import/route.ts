import { db, ensureTables } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const TYPE_KEYWORDS: [string, string][] = [
  ["транспорт", "transport"],
  ["мфц", "mfc"],
  ["метро", "metro"],
  ["лифт", "lift"],
  ["кд", "kd"],
  ["канатн", "kd"],
];

const COL_MAP: Record<string, string[]> = {
  originalIndex: ["№", "n", "index", "номер", "п/п"],
  location: ["транспорт", "мфц", "метро", "станция", "лифт", "нп", "кд"],
  category: ["категория", "блок"],
  client: ["заказчик", "client"],
  mediaObject: ["медиаобъект", "название ролика", "ролик", "название", "медиа"],
  duration: ["хроно", "длительность", "duration", "сек", "секунды"],
};

function detectType(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [kw, t] of TYPE_KEYWORDS) {
    if (lower.includes(kw)) return t;
  }
  return null;
}

function findCol(headers: string[], field: string): number {
  const cands = COL_MAP[field] || [];
  for (const c of cands) {
    const i = headers.findIndex((h) => h.toLowerCase().trim().includes(c));
    if (i >= 0) return i;
  }
  return -1;
}

function cellStr(cell: any): string {
  if (!cell || cell.value == null) return "";
  const v = cell.value;
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return String(v);
  if (typeof v === "object" && v !== null) {
    if (v.richText) return v.richText.map((r: any) => r.text || "").join("").trim();
    if (v.result !== undefined) return String(v.result).trim();
  }
  return String(v).trim();
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

export async function POST(request: NextRequest) {
  try {
    await ensureTables();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    console.log(`[Import] File: ${file.name}, Size: ${(file.size / 1024).toFixed(1)} KB`);

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    console.log(`[Import] Sheets: ${workbook.worksheets.map(w => w.name).join(", ")}`);

    const results: { sheet: string; type: string; rows: number; kind: string }[] = [];
    let processedSheets = 0;

    for (const ws of workbook.worksheets) {
      const name = ws.name;
      const lower = name.toLowerCase();
      const isSummary = lower.includes("свод");
      const isPlaylist = lower.includes("плейлист");
      if (!isSummary && !isPlaylist) continue;

      const type = detectType(name);
      if (!type) {
        results.push({ sheet: name, type: "не определён", rows: 0, kind: isSummary ? "summary" : "playlist" });
        console.log(`[Import] Skipped sheet "${name}" — type not detected`);
        continue;
      }

      const headers: string[] = [];
      ws.getRow(1).eachCell({ includeEmpty: false }, (cell: any, cn: number) => {
        headers[cn - 1] = cellStr(cell);
      });

      console.log(`[Import] Processing "${name}" as ${isSummary ? "summary" : "playlist"} (${type})`);

      try {
        if (isPlaylist) {
          await importPlaylist(ws, headers, type, results, name);
        } else {
          await importSummary(ws, headers, type, results, name);
        }
        processedSheets++;
      } catch (sheetError) {
        console.error(`[Import] Error in sheet "${name}":`, sheetError);
        results.push({ sheet: name, type, rows: 0, kind: isSummary ? "summary" : "playlist" });
      }
    }

    if (processedSheets === 0 && results.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Не найдены листы с названиями «Плейлист» или «Свод»",
        results,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Import] Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const cleanMsg = msg.includes("LIBSQL_ERROR")
      ? "Ошибка базы данных: проверьте подключение к Turso"
      : msg.length > 200 ? msg.substring(0, 200) + "..." : msg;
    return NextResponse.json({ error: "Ошибка импорта", details: cleanMsg }, { status: 500 });
  }
}

// Fast import using a single multi-row INSERT inside a transaction
async function importPlaylist(ws: any, headers: string[], type: string, results: any[], sheetName: string) {
  const cols = {
    originalIndex: findCol(headers, "originalIndex"),
    location: findCol(headers, "location"),
    category: findCol(headers, "category"),
    client: findCol(headers, "client"),
    mediaObject: findCol(headers, "mediaObject"),
    duration: findCol(headers, "duration"),
  };

  console.log(`[Import] Column mapping:`, cols);

  // Collect all rows in memory first
  const rows: string[] = [];
  let imported = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals: Record<number, string> = {};
    row.eachCell({ includeEmpty: true }, (cell: any, cn: number) => { vals[cn - 1] = cellStr(cell); });

    const client = cols.client >= 0 ? vals[cols.client] : "";
    const media = cols.mediaObject >= 0 ? vals[cols.mediaObject] : "";
    if (!client && !media) continue;

    const idx = cols.originalIndex >= 0 ? (parseInt(vals[cols.originalIndex]) || imported + 1) : imported + 1;
    const location = cols.location >= 0 ? vals[cols.location] : "";
    const category = cols.category >= 0 ? vals[cols.category] : "";
    const dur = cols.duration >= 0 ? (parseInt(vals[cols.duration]) || 0) : 0;

    rows.push(`(${idx},'${escapeSql(type)}','${escapeSql(location)}','${escapeSql(category)}','${escapeSql(client)}','${escapeSql(media)}',${dur},datetime('now'),datetime('now'))`);
    imported++;
  }

  if (imported === 0) {
    console.log(`[Import] No rows to import for ${type}`);
    results.push({ sheet: sheetName, type, rows: 0, kind: "playlist" });
    return;
  }

  // Execute as a single transaction with batched INSERT statements
  const BATCH_SIZE = 500;
  console.log(`[Import] Inserting ${imported} rows in ${Math.ceil(rows.length / BATCH_SIZE)} batches (batch_size=${BATCH_SIZE})...`);

  await db.execute({ sql: `DELETE FROM "Playlist" WHERE "type" = :type`, args: { type } });
  await db.execute("BEGIN");

  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).join(",");
      await db.execute({
        sql: `INSERT INTO "Playlist" ("originalIndex","type","location","category","client","mediaObject","duration","createdAt","updatedAt") VALUES ${batch}`,
        args: {},
      });
    }
    await db.execute("COMMIT");
  } catch (e) {
    await db.execute("ROLLBACK").catch(() => {});
    throw e;
  }

  console.log(`[Import] Imported ${imported} playlist rows for ${type}`);
  results.push({ sheet: sheetName, type, rows: imported, kind: "playlist" });
}

// Fast summary import using transaction
async function importSummary(ws: any, headers: string[], type: string, results: any[], sheetName: string) {
  const levelCol = headers.findIndex((h) => /уровень|level/i.test(h.trim()));
  const descCol = headers.findIndex((h) => /описан|description/i.test(h.trim()));
  const rollersCol = headers.findIndex((h) => /ролик|roller/i.test(h.trim()));
  const secondsCol = headers.findIndex((h) => /секунд|second|длительн|duration/i.test(h.trim()));

  let nameCol = 0;
  if (levelCol === 0) nameCol = 1;

  const rows: string[] = [];
  let imported = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals: Record<number, string> = {};
    row.eachCell({ includeEmpty: true }, (cell: any, cn: number) => { vals[cn - 1] = cellStr(cell); });

    const name = vals[nameCol] || "";
    if (!name) continue;

    let level = 1;
    if (levelCol >= 0) {
      level = parseInt(vals[levelCol]) || 1;
    } else {
      const cell = row.getCell(nameCol + 1);
      const indent = cell.font?.indent || 0;
      const bold = cell.font?.bold;
      if (name.toLowerCase().startsWith("итого")) level = 1;
      else if (indent === 0 && bold) level = 2;
      else if (indent >= 2) level = 4;
      else level = 3;
    }

    const description = descCol >= 0 ? vals[descCol] : "";
    const rollers = rollersCol >= 0 ? (parseInt(vals[rollersCol]) || 0) : 0;
    const seconds = secondsCol >= 0 ? (parseInt(vals[secondsCol]) || 0) : 0;
    const manual = rollers > 0 || seconds > 0 ? 1 : 0;

    rows.push(`('${escapeSql(type)}',${level},'${escapeSql(name)}','${escapeSql(description)}',NULL,NULL,NULL,${rollers},${seconds},0,${manual},datetime('now'),datetime('now'))`);
    imported++;
  }

  if (imported === 0) {
    console.log(`[Import] No summary rows for ${type}`);
    results.push({ sheet: sheetName, type, rows: 0, kind: "summary" });
    return;
  }

  const BATCH_SIZE = 500;

  await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "type" = :type`, args: { type } });
  await db.execute("BEGIN");

  try {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).join(",");
      await db.execute({
        sql: `INSERT INTO "PlaylistSummary" ("type","level","categoryName","description","matchField","matchMode","matchValue","rollers","seconds","percent","manualValues","createdAt","updatedAt") VALUES ${batch}`,
        args: {},
      });
    }
    await db.execute("COMMIT");
  } catch (e) {
    await db.execute("ROLLBACK").catch(() => {});
    throw e;
  }

  // Apply filter templates from summary-structure.ts
  try {
    const { SUMMARY_STRUCTURES } = await import("@/components/dashboard/summary-structure");
    const structure = (SUMMARY_STRUCTURES as any[]).find((s) => s.type === type);
    if (structure) {
      await db.execute("BEGIN");
      try {
        for (const item of structure.items) {
          if (!item.filter) continue;
          await db.execute({
            sql: `UPDATE "PlaylistSummary" SET "matchField"=:mf,"matchMode"=:mm,"matchValue"=:mv WHERE "type"=:type AND "categoryName"=:name`,
            args: { mf: item.filter.field, mm: item.filter.mode, mv: item.filter.value, type, name: item.name },
          });
        }
        await db.execute("COMMIT");
      } catch (e) {
        await db.execute("ROLLBACK").catch(() => {});
        throw e;
      }
    }
  } catch (e) {
    console.warn("[Import] Template match warning:", e);
  }

  console.log(`[Import] Imported ${imported} summary rows for ${type}`);
  results.push({ sheet: sheetName, type, rows: imported, kind: "summary" });
}
