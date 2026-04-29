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
    const i = headers.findIndex((h) => h && h.toLowerCase().trim().includes(c));
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
    if (v.text) return String(v.text).trim();
  }
  return String(v).trim();
}

function safeStr(val: string | undefined | null, fallback: string = ""): string {
  return (val || "").trim();
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

// Check if a cell contains a formula or unparseable computed cell
function isFormulaCell(cell: any): boolean {
  if (!cell || cell.value == null) return false;
  const v = cell.value;
  if (typeof v !== "object" || v === null) return false;
  // Formula cells (COUNTIF, SUMIF, sharedFormula) without cached result
  if ((v.formula || v.sharedFormula) && v.result === undefined) return true;
  // Unparseable cells that cellStr converts to "[object Object]"
  if (!v.richText && !v.text && v.result === undefined && !Number.isFinite(v)) return true;
  return false;
}

// Check if all numeric columns in a row are formula cells
function isFormulaRow(row: any, numericCols: number[]): boolean {
  if (numericCols.length === 0) return false;
  let formulaCount = 0;
  for (const col of numericCols) {
    const cell = row.getCell(col + 1); // 1-indexed
    if (isFormulaCell(cell)) formulaCount++;
  }
  return formulaCount === numericCols.length;
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

    const results: { sheet: string; type: string; rows: number; kind: string; error?: string }[] = [];
    let processedSheets = 0;
    const allSheetNames = workbook.worksheets.map(w => w.name);
    
    // Collect all types that will be imported, then delete existing data for them
    const typesToImport = new Set<string>();
    for (const ws of workbook.worksheets) {
      const name = ws.name;
      const lower = name.toLowerCase();
      if (lower.includes("свод") || lower.includes("плейлист")) {
        const t = detectType(name);
        if (t) typesToImport.add(t);
      }
    }
    
    // Delete existing data for all types that will be re-imported
    for (const t of typesToImport) {
      try {
        await db.execute({ sql: `DELETE FROM "Playlist" WHERE "type" = :t`, args: { t } });
        await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "type" = :t`, args: { t } });
        console.log(`[Import] Deleted existing data for type: ${t}`);
      } catch (e) {
        console.warn(`[Import] Warning: could not delete existing data for ${t}:`, e);
      }
    }

    for (const ws of workbook.worksheets) {
      const name = ws.name;
      const lower = name.toLowerCase();
      const isSummary = lower.includes("свод");
      const isPlaylist = lower.includes("плейлист");
      console.log(`[Import] Sheet "${name}": summary=${isSummary}, playlist=${isPlaylist}`);
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
      } catch (sheetError: any) {
        const errMsg = sheetError instanceof Error ? sheetError.message : String(sheetError);
        console.error(`[Import] Error in sheet "${name}":`, errMsg);
        results.push({ sheet: name, type, rows: 0, kind: isSummary ? "summary" : "playlist", error: errMsg });
      }
    }

    if (processedSheets === 0 && results.length > 0) {
      const failedSheets = results.filter(r => r.error).map(r => `${r.sheet}: ${r.error}`);
      return NextResponse.json({
        success: false,
        error: "Ошибка при импорте листов",
        details: failedSheets.length > 0
          ? failedSheets.join("\n")
          : `Найденные листы: ${allSheetNames.join(", ")}`,
        results,
      }, { status: 400 });
    }

    if (processedSheets === 0) {
      return NextResponse.json({
        success: false,
        error: "В файле нет подходящих листов",
        details: `Найденные листы: ${allSheetNames.length === 0 ? '(пустой файл)' : allSheetNames.join(", ")}`,
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

// Import playlist — multi-row INSERT without transaction (Turso compatible)
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

  const BATCH_SIZE = 100;
  let batchRows: string[] = [];
  let imported = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const vals: Record<number, string> = {};
    row.eachCell({ includeEmpty: true }, (cell: any, cn: number) => { vals[cn - 1] = cellStr(cell); });

    const client = cols.client >= 0 ? safeStr(vals[cols.client]) : "";
    const media = cols.mediaObject >= 0 ? safeStr(vals[cols.mediaObject]) : "";
    if (!client && !media) continue;

    const idx = cols.originalIndex >= 0 ? (parseInt(vals[cols.originalIndex]) || imported + 1) : imported + 1;
    const location = cols.location >= 0 ? safeStr(vals[cols.location]) : "";
    const category = cols.category >= 0 ? safeStr(vals[cols.category]) : "";
    const dur = cols.duration >= 0 ? (parseInt(vals[cols.duration]) || 0) : 0;

    batchRows.push(`(${idx},'${escapeSql(type)}','${escapeSql(location)}','${escapeSql(category)}','${escapeSql(client)}','${escapeSql(media)}',${dur},datetime('now'),datetime('now'))`);
    imported++;

    if (batchRows.length >= BATCH_SIZE) {
      await flushPlaylistBatch(type, batchRows);
      batchRows = [];
    }
  }

  // Flush remaining
  if (batchRows.length > 0) {
    await flushPlaylistBatch(type, batchRows);
  }

  console.log(`[Import] Imported ${imported} playlist rows for ${type}`);
  results.push({ sheet: sheetName, type, rows: imported, kind: "playlist" });
}

async function flushPlaylistBatch(type: string, rows: string[]) {
  const sql = `INSERT INTO "Playlist" ("originalIndex","type","location","category","client","mediaObject","duration","createdAt","updatedAt") VALUES ${rows.join(",")}`;
  await db.execute({ sql, args: {} });
  console.log(`[Import] Flushed ${rows.length} playlist rows`);
}

// Import summary — supports real Excel layout:
//   No text headers in row 1 (all null), data starts from row 2
//   C1=level1 name, C2=level2 name, C3=level3 name/detail, C4=роликов*, C5=секунд, C6=процентов
//   Also supports layout with headers: УР., КАТЕГОРИЯ, РОЛИКИ, СЕК., %
async function importSummary(ws: any, headers: string[], type: string, results: any[], sheetName: string) {
  // Check if row 1 has actual text headers or is empty (real data starts row 2)
  const hasTextHeaders = headers.some(h => h && h.length > 0 && !h.startsWith("["));

  let rollersColIdx = -1;
  let secondsColIdx = -1;
  let percentColIdx = -1;
  const dataStartRow = 2;

  if (hasTextHeaders) {
    rollersColIdx = headers.findIndex((h) => h && /ролик|roller|роли/i.test(h.trim()));
    secondsColIdx = headers.findIndex((h) => h && /^сек\.?$|секунд|second|длительн|duration|секун/i.test(h.trim()));
    percentColIdx = headers.findIndex((h) => h && /^%$|процент|percent/i.test(h.trim()));
  } else {
    // No text headers — detect numeric columns from first data rows
    // Strategy: collect ALL column values across rows 2-5, then classify
    const colSamples: Record<number, number[]> = {};
    for (let r = 2; r <= Math.min(ws.rowCount, 6); r++) {
      const row = ws.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell: any, cn: number) => {
        const val = cellStr(cell);
        const num = parseFloat(val);
        if (isNaN(num)) return;
        if (!colSamples[cn - 1]) colSamples[cn - 1] = [];
        colSamples[cn - 1].push(num);
      });
    }

    // Classify columns: find ones that are always 0-1 (percent) vs larger integers
    const intCols: number[] = [];
    const pctCols: number[] = [];
    for (const [colStr, samples] of Object.entries(colSamples)) {
      const col = parseInt(colStr);
      const hasDecimal = samples.some(v => v !== Math.floor(v));
      const maxVal = Math.max(...samples);
      const minVal = Math.min(...samples);

      if (hasDecimal && maxVal <= 1 && minVal >= 0) {
        // Likely a percent column (0-1 floats)
        pctCols.push(col);
      } else if (maxVal >= 1) {
        intCols.push(col);
      }
    }

    // Sort by column position
    intCols.sort((a, b) => a - b);
    pctCols.sort((a, b) => a - b);

    // If we have 3+ int columns, last one might be percent stored as decimal
    // Typical: rollers (small) | seconds (large) | percent (0-1)
    if (intCols.length >= 2) {
      rollersColIdx = intCols[0];
      secondsColIdx = intCols[1];
    }
    if (pctCols.length >= 1) {
      percentColIdx = pctCols[0];
    } else if (intCols.length >= 3) {
      // Third column might be percent
      const thirdColSamples = colSamples[String(intCols[2])];
      if (thirdColSamples && thirdColSamples.every(v => v >= 0 && v <= 1)) {
        percentColIdx = intCols[2];
      }
    }

    // Ensure rollersCol < secondsCol (rollers are typically smaller numbers)
    if (rollersColIdx > secondsColIdx) {
      [rollersColIdx, secondsColIdx] = [secondsColIdx, rollersColIdx];
    }
  }

  console.log(`[Import] Summary "${sheetName}": hasHeaders=${hasTextHeaders}, rollersCol=${rollersColIdx}, secondsCol=${secondsColIdx}, percentCol=${percentColIdx}`);

  // Determine how many name columns exist (before the first numeric column)
  // Real layout: 6-col sheets have 3 name cols, 5-col sheets have 2 name cols
  const firstNumCol = Math.min(
    ...[rollersColIdx, secondsColIdx, percentColIdx].filter(c => c >= 0),
    Infinity
  );
  const nameColCount = isFinite(firstNumCol) ? firstNumCol : 3;

  const BATCH_SIZE = 100;
  let batchRows: string[] = [];
  let imported = 0;

  const numericCols = [rollersColIdx, secondsColIdx, percentColIdx].filter(c => c >= 0);
  const seenNames = new Set<string>(); // dedup by (level, name)

  for (let r = dataStartRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);

    // Collect raw cell values for name columns
    const nameTexts: { col: number; text: string }[] = [];
    for (let c = 0; c < nameColCount; c++) {
      const cell = row.getCell(c + 1); // 1-indexed
      const t = cellStr(cell);
      if (t) nameTexts.push({ col: c, text: t });
    }

    if (nameTexts.length === 0) continue; // skip empty rows

    // Skip formula-only rows (e.g. COUNTIF/SUMIF at end of sheet)
    if (isFormulaRow(row, numericCols)) {
      console.log(`[Import] Skipping formula row ${r}: ${nameTexts.map(n => n.text).join(' ')}`);
      continue;
    }

    // Skip footer/metadata rows from Excel
    const allText = nameTexts.map(n => n.text).join(' ');
    const lowerAll = allText.toLowerCase();
    if (allText.startsWith('*') ||
        lowerAll.startsWith('количество повторов') ||
        lowerAll.startsWith('примечание') ||
        lowerAll.startsWith('всего') ||
        lowerAll.includes('повтор всех роликов') ||
        lowerAll.includes('средняя длительность') ||
        lowerAll.includes('примечани')) {
      console.log(`[Import] Skipping footer row ${r}: "${allText.substring(0, 60)}"`);
      continue;
    }

    // Read numeric values (after formula check)
    const vals: Record<number, string> = {};
    row.eachCell({ includeEmpty: true }, (cell: any, cn: number) => {
      vals[cn - 1] = cellStr(cell);
    });

    // Determine level: which column has the text?
    // C0 = level 1 (итого) or level 2 (section)
    // C1 = level 3 (sub-section)
    // C2 = level 4 (detail)
    // Special case: row with "итого" repeated in multiple cols = level 1
    const firstText = nameTexts[0];
    let level: number;
    let name: string;
    let description = "";

    if (firstText.col === 0 && firstText.text.toLowerCase().startsWith("итого")) {
      level = 1;
      name = "Итого";
    } else if (firstText.col === 0) {
      level = 2;
      name = firstText.text;
    } else if (firstText.col === 1) {
      level = 3;
      name = firstText.text;
    } else if (firstText.col === 2) {
      level = 4;
      name = firstText.text;
      description = firstText.text; // long detail text
    } else {
      level = 3;
      name = firstText.text;
    }

    // Dedup check: skip if (level, name) already seen
    const dedupKey = `${level}:${name}`;
    if (seenNames.has(dedupKey)) {
      console.log(`[Import] Skipping duplicate row ${r}: [${type}] ${name} (level ${level})`);
      continue;
    }
    seenNames.add(dedupKey);

    // Get numeric values — try cell.result first (for formula cells with cached values)
    let rollers = 0, seconds = 0, percent = 0;
    if (rollersColIdx >= 0) {
      const cell = row.getCell(rollersColIdx + 1);
      if (cell && cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) {
        rollers = parseInt(String(cell.value.result)) || 0;
      } else {
        rollers = parseInt(vals[rollersColIdx]) || 0;
      }
    }
    if (secondsColIdx >= 0) {
      const cell = row.getCell(secondsColIdx + 1);
      if (cell && cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) {
        seconds = parseInt(String(cell.value.result)) || 0;
      } else {
        seconds = parseInt(vals[secondsColIdx]) || 0;
      }
    }
    if (percentColIdx >= 0) {
      const cell = row.getCell(percentColIdx + 1);
      if (cell && cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) {
        percent = parseFloat(String(cell.value.result).replace("%", "").replace(",", ".")) || 0;
      } else {
        percent = parseFloat(String(vals[percentColIdx]).replace("%", "").replace(",", ".")) || 0;
      }
    }
    const manual = rollers > 0 || seconds > 0 ? 1 : 0;

    batchRows.push(`('${escapeSql(type)}',${level},'${escapeSql(name)}','${escapeSql(description)}',NULL,NULL,NULL,${rollers},${seconds},${percent},${manual},datetime('now'),datetime('now'))`);
    imported++;

    if (batchRows.length >= BATCH_SIZE) {
      await flushSummaryBatch(type, batchRows);
      batchRows = [];
    }
  }

  // Flush remaining
  if (batchRows.length > 0) {
    await flushSummaryBatch(type, batchRows);
  }

  // Apply filter templates from summary-structure.ts
  try {
    const { SUMMARY_STRUCTURES } = await import("@/components/dashboard/summary-structure");
    const structure = (SUMMARY_STRUCTURES as any[]).find((s) => s.type === type);
    if (structure) {
      for (const item of structure.items) {
        if (!item.filter) continue;
        await db.execute({
          sql: `UPDATE "PlaylistSummary" SET "matchField"=:mf,"matchMode"=:mm,"matchValue"=:mv WHERE "type"=:type AND "categoryName"=:name`,
          args: { mf: item.filter.field, mm: item.filter.mode, mv: item.filter.value, type, name: item.name },
        });
      }
    }
  } catch (e) {
    console.warn("[Import] Template match warning:", e);
  }

  // Self-check: remove any remaining duplicates (same type + level + categoryName)
  // Uses simple approach: fetch all rows, find duplicates by (level, categoryName), delete extras
  const validationWarnings: string[] = [];
  try {
    const allRows = await db.execute({
      sql: `SELECT "id", "level", "categoryName" FROM "PlaylistSummary" WHERE "type"=:type ORDER BY "id" ASC`,
      args: { type },
    });
    const seen = new Map<string, number[]>(); // key: "level:name" -> [id1, id2, ...]
    for (const row of allRows.rows) {
      const key = `${row.level}:${row.categoryName}`;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(Number(row.id));
    }
    for (const [key, ids] of seen) {
      if (ids.length <= 1) continue;
      const [lvl, ...nameParts] = key.split(":");
      const name = nameParts.join(":");
      validationWarnings.push(`Дубликат: "${name}" (уровень ${lvl}) — удалено ${ids.length - 1} копий`);
      console.log(`[Import] Dedup: removing ${ids.length - 1} duplicate(s) of "${name}" (level ${lvl}), keeping id=${ids[0]}`);
      // Delete all but the first
      for (let d = 1; d < ids.length; d++) {
        await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "id"=:id`, args: { id: ids[d] } });
      }
    }
  } catch (e) {
    console.warn("[Import] Dedup check warning:", e);
  }

  console.log(`[Import] Imported ${imported} summary rows for ${type} (${validationWarnings.length} warnings)`);
  results.push({ sheet: sheetName, type, rows: imported, kind: "summary", validation: validationWarnings.length > 0 ? validationWarnings : undefined });
}

async function flushSummaryBatch(type: string, rows: string[]) {
  const sql = `INSERT INTO "PlaylistSummary" ("type","level","categoryName","description","matchField","matchMode","matchValue","rollers","seconds","percent","manualValues","createdAt","updatedAt") VALUES ${rows.join(",")}`;
  await db.execute({ sql, args: {} });
  console.log(`[Import] Flushed ${rows.length} summary rows`);
}
