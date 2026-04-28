import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { SUMMARY_STRUCTURES } from "@/components/dashboard/summary-structure";

let migrationDone = false;

async function ensureSchema() {
  if (migrationDone) return;
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
  migrationDone = true;
}

let seedDone = new Set<string>();

async function ensureSeeded(type: string) {
  if (seedDone.has(type)) return;
  const structure = SUMMARY_STRUCTURES.find((s) => s.type === type);
  if (!structure) { seedDone.add(type); return; }
  const countResult = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM "PlaylistSummary" WHERE "type" = :type`, args: { type } });
  const rowCount = Number(countResult.rows[0]?.cnt || 0);
  if (rowCount === 0) {
    for (const item of structure.items) {
      await db.execute({
        sql: `INSERT INTO "PlaylistSummary" ("type","level","categoryName","description","matchField","matchMode","matchValue","rollers","seconds","percent","manualValues","createdAt","updatedAt") VALUES (:type,:level,:categoryName,:description,:matchField,:matchMode,:matchValue,0,0,0,0,datetime('now'),datetime('now'))`,
        args: { type, level: item.level, categoryName: item.name, description: item.description, matchField: item.filter?.field || null, matchMode: item.filter?.mode || null, matchValue: item.filter?.value || null },
      });
    }
  }
  seedDone.add(type);
}

async function countByFilter(type: string, matchField: string | null, matchMode: string | null, matchValue: string | null) {
  if (!matchField || !matchValue) return { rollers: 0, seconds: 0 };
  const col = matchField === "category" ? '"category"' : '"client"';
  const args: Record<string, string | number | boolean | null> = { type };
  let sql: string;
  if (matchMode === "exact") { sql = `SELECT COUNT(*) as cnt, COALESCE(SUM("duration"),0) as dur FROM "Playlist" WHERE "type"=:type AND ${col}=:val`; args.val = matchValue; }
  else if (matchMode === "startsWith") { sql = `SELECT COUNT(*) as cnt, COALESCE(SUM("duration"),0) as dur FROM "Playlist" WHERE "type"=:type AND ${col} LIKE :val`; args.val = `${matchValue}%`; }
  else { sql = `SELECT COUNT(*) as cnt, COALESCE(SUM("duration"),0) as dur FROM "Playlist" WHERE "type"=:type AND ${col} LIKE :val`; args.val = `%${matchValue}%`; }
  try { const result = await db.execute({ sql, args }); return { rollers: Number(result.rows[0]?.cnt || 0), seconds: Number(result.rows[0]?.dur || 0) }; }
  catch (e) { console.error("[Summary] countByFilter error:", e); return { rollers: 0, seconds: 0 }; }
}

async function getTotalSeconds(type: string) {
  try { const r = await db.execute({ sql: `SELECT COALESCE(SUM("duration"),0) as total FROM "Playlist" WHERE "type"=:type`, args: { type } }); return Number(r.rows[0]?.total || 0); } catch { return 0; }
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const type = request.nextUrl.searchParams.get("type");
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
    await ensureSeeded(type);
    const result = await db.execute({ sql: `SELECT * FROM "PlaylistSummary" WHERE "type"=:type ORDER BY "id" ASC`, args: { type } });
    const rows = result.rows;
    if (rows.length === 0) return NextResponse.json({ items: [], totalSeconds: 0 });
    const totalSeconds = await getTotalSeconds(type);
    const computed = rows.map((row) => {
      const lvl = Number(row.level ?? 0); const isSection = lvl <= 2; const hasManual = Number(row.manualValues) === 1;
      return { id: Number(row.id), level: lvl, name: String(row.categoryName || ""), description: String(row.description || ""), matchField: row.matchField as string | null, matchMode: row.matchMode as string | null, matchValue: row.matchValue as string | null, rollers: hasManual ? Number(row.rollers || 0) : 0, seconds: hasManual ? Number(row.seconds || 0) : 0, percent: 0, isSection, manualValues: hasManual };
    });
    for (const item of computed) {
      if (item.manualValues || item.isSection) continue;
      if (item.matchField) { const stats = await countByFilter(type, item.matchField, item.matchMode, item.matchValue); item.rollers = stats.rollers; item.seconds = stats.seconds; }
    }
    for (let i = 0; i < computed.length; i++) {
      const item = computed[i]; if (!item.isSection) continue;
      let tr = 0, ts = 0;
      for (let j = i + 1; j < computed.length; j++) { if (computed[j].level <= item.level) break; tr += computed[j].rollers; ts += computed[j].seconds; }
      if (item.level === 1) { item.rollers = tr; item.seconds = totalSeconds; item.percent = 100; }
      else { item.rollers = tr; item.seconds = ts; item.percent = totalSeconds > 0 ? Math.round((ts / totalSeconds) * 10000) / 100 : 0; }
    }
    for (const item of computed) { if (item.isSection) continue; item.percent = totalSeconds > 0 ? Math.round((item.seconds / totalSeconds) * 10000) / 100 : 0; }
    return NextResponse.json({ items: computed, totalSeconds });
  } catch (error) { console.error("Error computing summary:", error); return NextResponse.json({ error: "Failed", details: String(error) }, { status: 500 }); }
}
