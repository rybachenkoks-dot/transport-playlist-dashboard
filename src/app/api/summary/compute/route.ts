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
  else { sql = `SELECT COUNT(*) as cnt, COALESCE(SUM("duration"),0) as dur FROM "Playlist" WHERE "type"=:type AND ${col} LIKE :val`; args.val = `${matchValue}%`; }
  try { const result = await db.execute({ sql, args }); return { rollers: Number(result.rows[0]?.cnt || 0), seconds: Number(result.rows[0]?.dur || 0) }; }
  catch (e) { console.error("[Summary] countByFilter error:", e); return { rollers: 0, seconds: 0 }; }
}

async function getTotalSeconds(type: string) {
  try { const r = await db.execute({ sql: `SELECT COALESCE(SUM("duration"),0) as total FROM "Playlist" WHERE "type"=:type`, args: { type } }); return Number(r.rows[0]?.total || 0); } catch { return 0; }
}

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  details?: string;
}

async function validateData(type: string, computed: any[]): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // 1. Check for duplicates
  const dupCheck = await db.execute({
    sql: `SELECT "categoryName", "level", COUNT(*) as cnt FROM "PlaylistSummary" WHERE "type"=:type GROUP BY "type","level","categoryName" HAVING cnt > 1`,
    args: { type },
  });
  for (const dup of dupCheck.rows) {
    issues.push({
      severity: "error",
      message: `Дубликат: "${dup.categoryName}" (уровень ${dup.level}) — ${dup.cnt} записей`,
    });
  }

  // 2. Check percent sum ~100%
  const level2Sections = computed.filter(i => i.level === 2);
  if (level2Sections.length > 0) {
    const totalPercent = level2Sections.reduce((sum, s) => sum + (s.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 5) {
      issues.push({
        severity: "warning",
        message: `Сумма процентов: ${totalPercent.toFixed(1)}% (ожидается ~100%)`,
      });
    }
  }

  return issues;
}

// An item is a section if the next item in the list has a deeper level
function isSection(items: any[], idx: number): boolean {
  if (idx + 1 >= items.length) return false;
  return items[idx + 1].level > items[idx].level;
}

// Sum direct children (level + 1) starting from idx
function sumDirectChildren(items: any[], idx: number): { rollers: number; seconds: number } {
  const parent = items[idx];
  let tr = 0, ts = 0;
  for (let j = idx + 1; j < items.length; j++) {
    if (items[j].level <= parent.level) break;
    if (items[j].level === parent.level + 1) {
      tr += items[j].rollers;
      ts += items[j].seconds;
    }
  }
  return { rollers: tr, seconds: ts };
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const type = request.nextUrl.searchParams.get("type");
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
    await ensureSeeded(type);
    const result = await db.execute({ sql: `SELECT * FROM "PlaylistSummary" WHERE "type"=:type ORDER BY "id" ASC`, args: { type } });
    let rows = result.rows;
    if (rows.length === 0) return NextResponse.json({ items: [], totalSeconds: 0, validation: [] });
    const totalSeconds = await getTotalSeconds(type);

    // Sync descriptions from SUMMARY_STRUCTURES template
    const structure = SUMMARY_STRUCTURES.find((s) => s.type === type);
    if (structure) {
      for (const tpl of structure.items) {
        if (!tpl.description) continue;
        await db.execute({
          sql: `UPDATE "PlaylistSummary" SET "description"=:desc WHERE "type"=:type AND "categoryName"=:name AND ("description" IS NULL OR "description"='')`,
          args: { desc: tpl.description, type, name: tpl.name },
        });
      }
      // Re-fetch to get updated descriptions
      const refreshed = await db.execute({ sql: `SELECT * FROM "PlaylistSummary" WHERE "type"=:type ORDER BY "id" ASC`, args: { type } });
      rows = refreshed.rows;
    }

    // Filter out garbage rows from Excel footers
    const garbageRe = /^\*/;
    const computed = rows
      .filter(row => !garbageRe.test(String(row.categoryName || "")))
      .map((row) => {
        const lvl = Number(row.level ?? 0);
        const hasManual = Number(row.manualValues) === 1;
        return {
          id: Number(row.id),
          level: lvl,
          name: String(row.categoryName || ""),
          description: String(row.description || ""),
          matchField: row.matchField as string | null,
          matchMode: row.matchMode as string | null,
          matchValue: row.matchValue as string | null,
          rollers: hasManual ? Number(row.rollers || 0) : 0,
          seconds: hasManual ? Number(row.seconds || 0) : 0,
          percent: 0,
          manualValues: hasManual,
        };
      });

    if (computed.length === 0) return NextResponse.json({ items: [], totalSeconds, validation: [] });

    // ============================================
    // STEP 1: Compute LEAF values (items with no children)
    //   - If manualValues=1 and no matchField → keep Excel value
    //   - If has matchField → compute from Playlist table
    //   - If no matchField and no manual → stays 0
    // ============================================
    for (let i = 0; i < computed.length; i++) {
      const item = computed[i];
      if (isSection(computed, i)) continue; // Skip sections, handle in Step 2
      if (item.matchField && !item.manualValues) {
        const stats = await countByFilter(type, item.matchField, item.matchMode, item.matchValue);
        item.rollers = stats.rollers;
        item.seconds = stats.seconds;
      }
      // Leaves with manualValues keep their DB rollers/seconds (already set above)
      // Leaves with no matchField and no manual stay at 0
    }

    // ============================================
    // STEP 2: Compute SECTION totals bottom-up
    //   ALWAYS recompute from direct children (level+1)
    //   regardless of manualValues — sections from Excel
    //   may have stale/incorrect values (double-counting)
    // ============================================
    const maxLevel = Math.max(...computed.map(i => i.level));
    for (let targetLevel = maxLevel; targetLevel >= 1; targetLevel--) {
      for (let i = 0; i < computed.length; i++) {
        const item = computed[i];
        if (item.level !== targetLevel) continue;
        if (!isSection(computed, i)) continue; // Not a section

        const children = sumDirectChildren(computed, i);

        if (item.level === 1) {
          // Итого: rollers from children, seconds from total playlist
          item.rollers = children.rollers;
          item.seconds = totalSeconds;
          item.percent = 100;
        } else {
          // Other sections: sum direct children
          item.rollers = children.rollers;
          item.seconds = children.seconds;
          item.percent = totalSeconds > 0 ? Math.round((children.seconds / totalSeconds) * 10000) / 100 : 0;
        }
      }
    }

    // ============================================
    // STEP 3: Compute percent for ALL non-section, non-итого items
    // ============================================
    for (let i = 0; i < computed.length; i++) {
      const item = computed[i];
      if (item.level === 1) continue;
      if (isSection(computed, i)) continue; // Sections already got percent in Step 2
      item.percent = totalSeconds > 0 ? Math.round((item.seconds / totalSeconds) * 10000) / 100 : 0;
    }

    // ============================================
    // STEP 4: Cleanup garbage from DB (one-time)
    // ============================================
    try {
      for (const row of rows) {
        const name = String(row.categoryName || "");
        if (garbageRe.test(name)) {
          await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "id"=:id`, args: { id: Number(row.id) } });
          console.log(`[Summary] Cleaned garbage id=${row.id}: "${name}"`);
        }
      }
    } catch (e) {
      console.warn("[Summary] Garbage cleanup warning:", e);
    }

    // ============================================
    // STEP 5: Validation
    // ============================================
    const validation = await validateData(type, computed);

    return NextResponse.json({ items: computed, totalSeconds, validation });
  } catch (error) {
    console.error("Error computing summary:", error);
    return NextResponse.json({ error: "Failed", details: String(error) }, { status: 500 });
  }
}
