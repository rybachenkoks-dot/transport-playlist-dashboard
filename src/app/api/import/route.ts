import { db } from "@/lib/db";
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
  originalIndex: ["\u2116", "n", "index", "\u043d\u043e\u043c\u0435\u0440", "\u043f/\u043f"],
  location: ["\u0442\u0440\u0430\u043d\u0441\u043f\u043e\u0440\u0442", "\u043c\u0444\u0446", "\u043c\u0435\u0442\u0440\u043e", "\u0441\u0442\u0430\u043d\u0446\u0438\u044f", "\u043b\u0438\u0444\u0442", "\u043d\u043f", "\u043a\u0434"],
  category: ["\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f", "\u0431\u043b\u043e\u043a"],
  client: ["\u0437\u0430\u043a\u0430\u0437\u0447\u0438\u043a", "client"],
  mediaObject: ["\u043c\u0435\u0434\u0438\u0430\u043e\u0431\u044a\u0435\u043a\u0442", "\u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0440\u043e\u043b\u0438\u043a\u0430", "\u0440\u043e\u043b\u0438\u043a", "\u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435", "\u043c\u0435\u0434\u0438\u0430"],
  duration: ["\u0445\u0440\u043e\u043d\u043e", "\u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c", "duration", "\u0441\u0435\u043a", "\u0441\u0435\u043a\u0443\u043d\u0434\u044b"],
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "\u0424\u0430\u0439\u043b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d" }, { status: 400 });
    }

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const results: { sheet: string; type: string; rows: number; kind: string }[] = [];

    for (const ws of workbook.worksheets) {
      const name = ws.name;
      const lower = name.toLowerCase();
      const isSummary = lower.includes("\u0441\u0432\u043e\u0434");
      const isPlaylist = lower.includes("\u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442");
      if (!isSummary && !isPlaylist) continue;

      const type = detectType(name);
      if (!type) {
        results.push({ sheet: name, type: "\u043d\u0435 \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0451\u043d", rows: 0, kind: isSummary ? "summary" : "playlist" });
        continue;
      }

      const headers: string[] = [];
      ws.getRow(1).eachCell({ includeEmpty: false }, (cell: any, cn: number) => {
        headers[cn - 1] = cellStr(cell);
      });

      if (isPlaylist) {
        await importPlaylist(ws, headers, type, results, name);
      } else {
        await importSummary(ws, headers, type, results, name);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Import] Error:", error);
    return NextResponse.json({ error: "\u041e\u0448\u0438\u0431\u043a\u0430 \u0438\u043c\u043f\u043e\u0440\u0442\u0430", details: String(error) }, { status: 500 });
  }
}

async function importPlaylist(ws: any, headers: string[], type: string, results: any[], sheetName: string) {
  const cols = {
    originalIndex: findCol(headers, "originalIndex"),
    location: findCol(headers, "location"),
    category: findCol(headers, "category"),
    client: findCol(headers, "client"),
    mediaObject: findCol(headers, "mediaObject"),
    duration: findCol(headers, "duration"),
  };

  await db.execute(`CREATE TABLE IF NOT EXISTS "Playlist" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "originalIndex" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "client" TEXT NOT NULL DEFAULT '',
    "mediaObject" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT ''
  )`);

  await db.execute({ sql: `DELETE FROM "Playlist" WHERE "type" = :type`, args: { type } });

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

    await db.execute({
      sql: `INSERT INTO "Playlist" ("originalIndex","type","location","category","client","mediaObject","duration","createdAt","updatedAt") VALUES (:idx,:type,:loc,:cat,:cli,:media,:dur,datetime('now'),datetime('now'))`,
      args: { idx, type, loc: location, cat: category, cli: client, media, dur },
    });
    imported++;
  }

  results.push({ sheet: sheetName, type, rows: imported, kind: "playlist" });
}

async function importSummary(ws: any, headers: string[], type: string, results: any[], sheetName: string) {
  const levelCol = headers.findIndex((h) => /\u0443\u0440\u043e\u0432\u0435\u043d\u044c|level/i.test(h.trim()));
  const descCol = headers.findIndex((h) => /\u043e\u043f\u0438\u0441\u0430\u043d|description/i.test(h.trim()));
  const rollersCol = headers.findIndex((h) => /\u0440\u043e\u043b\u0438\u043a|roller/i.test(h.trim()));
  const secondsCol = headers.findIndex((h) => /\u0441\u0435\u043a\u0443\u043d\u0434|second|\u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d|duration/i.test(h.trim()));

  let nameCol = 0;
  if (levelCol === 0) nameCol = 1;

  await db.execute(`CREATE TABLE IF NOT EXISTS "PlaylistSummary" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 1,
    "categoryName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "matchField" TEXT DEFAULT NULL,
    "matchMode" TEXT DEFAULT NULL,
    "matchValue" TEXT DEFAULT NULL,
    "rollers" INTEGER NOT NULL DEFAULT 0,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "percent" REAL NOT NULL DEFAULT 0,
    "manualValues" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT '',
    "updatedAt" TEXT NOT NULL DEFAULT ''
  )`);

  await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "type" = :type`, args: { type } });

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
      if (name.toLowerCase().startsWith("\u0438\u0442\u043e\u0433\u043e")) level = 1;
      else if (indent === 0 && bold) level = 2;
      else if (indent >= 2) level = 4;
      else level = 3;
    }

    const description = descCol >= 0 ? vals[descCol] : "";
    const rollers = rollersCol >= 0 ? (parseInt(vals[rollersCol]) || 0) : 0;
    const seconds = secondsCol >= 0 ? (parseInt(vals[secondsCol]) || 0) : 0;
    const manual = rollers > 0 || seconds > 0 ? 1 : 0;

    await db.execute({
      sql: `INSERT INTO "PlaylistSummary" ("type","level","categoryName","description","matchField","matchMode","matchValue","rollers","seconds","percent","manualValues","createdAt","updatedAt") VALUES (:type,:level,:name,:desc,NULL,NULL,NULL,:rollers,:seconds,0,:manual,datetime('now'),datetime('now'))`,
      args: { type, level, name, desc: description, rollers, seconds, manual },
    });
    imported++;
  }

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

  results.push({ sheet: sheetName, type, rows: imported, kind: "summary" });
}
