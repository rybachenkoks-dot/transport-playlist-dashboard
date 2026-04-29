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

  // 1. Check for duplicate entries (same categoryName + level)
  const dupCheck = await db.execute({
    sql: `SELECT "categoryName", "level", COUNT(*) as cnt FROM "PlaylistSummary" WHERE "type"=:type GROUP BY "type","level","categoryName" HAVING cnt > 1`,
    args: { type },
  });
  for (const dup of dupCheck.rows) {
    issues.push({
      severity: "error",
      message: `Дубликат: "${dup.categoryName}" (уровень ${dup.level}) — ${dup.cnt} записей`,
      details: "Удалите лишние записи через API или повторите импорт"
    });
  }

  // 2. Check section totals vs sum of children
  for (let i = 0; i < computed.length; i++) {
    const item = computed[i];
    if (item.level < 1 || item.level > 3) continue;
    if (item.manualValues) continue; // Manual values don't need validation

    // Find children (level + 1 items directly under this one)
    let childRollers = 0, childSeconds = 0;
    let hasChildren = false;
    for (let j = i + 1; j < computed.length; j++) {
      if (computed[j].level <= item.level) break;
      if (computed[j].level === item.level + 1) {
        childRollers += computed[j].rollers;
        childSeconds += computed[j].seconds;
        hasChildren = true;
      }
    }

    if (!hasChildren) continue;

    // For level 1 (Итого), seconds should match totalSeconds, so skip seconds check
    if (item.level === 1) {
      if (item.rollers !== childRollers) {
        issues.push({
          severity: "warning",
          message: `Итого: несоответствие роликов (${item.rollers} vs сумма детей ${childRollers})`,
        });
      }
      continue;
    }

    // Check rollers mismatch
    if (item.rollers !== childRollers && childRollers > 0) {
      issues.push({
        severity: "warning",
        message: `"${item.name}": ролики (${item.rollers}) не совпадают с суммой детей (${childRollers})`,
      });
    }

    // Check seconds mismatch
    if (item.seconds !== childSeconds && childSeconds > 0) {
      issues.push({
        severity: "warning",
        message: `"${item.name}": длительность (${item.seconds}с) не совпадает с суммой детей (${childSeconds}с)`,
      });
    }
  }

  // 3. Check for items with no matchField and no children (orphan items)
  for (let i = 0; i < computed.length; i++) {
    const item = computed[i];
    if (item.level === 1) continue; // Итого always valid
    if (item.matchField) continue;  // Has a filter, will get data
    if (item.manualValues) continue; // Has manual values from Excel

    // Check if this item has children
    let hasChildren = false;
    for (let j = i + 1; j < computed.length; j++) {
      if (computed[j].level <= item.level) break;
      hasChildren = true;
      break;
    }

    if (!hasChildren && item.rollers === 0 && item.seconds === 0) {
      issues.push({
        severity: "warning",
        message: `"${item.name}" (уровень ${item.level}): нет данных и нет фильтра`,
        details: "Добавьте фильтр matchField в summary-structure или проверьте Excel"
      });
    }
  }

  // 4. Check if percentages sum to ~100% for level 2 sections
  const level2Sections = computed.filter(i => i.level === 2);
  if (level2Sections.length > 0) {
    const totalPercent = level2Sections.reduce((sum, s) => sum + (s.percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 2) {
      issues.push({
        severity: "warning",
        message: `Сумма процентов секций: ${totalPercent.toFixed(1)}% (ожидается ~100%)`,
      });
    }
  }

  return issues;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSchema();
    const type = request.nextUrl.searchParams.get("type");
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
    await ensureSeeded(type);
    const result = await db.execute({ sql: `SELECT * FROM "PlaylistSummary" WHERE "type"=:type ORDER BY "id" ASC`, args: { type } });
    const rows = result.rows;
    if (rows.length === 0) return NextResponse.json({ items: [], totalSeconds: 0, validation: [] });
    const totalSeconds = await getTotalSeconds(type);

    // Filter out garbage rows (footers, notes from Excel)
    const garbagePatterns = [/^\*/i, /^количество повторов/i, /^примечание/i, /^всего/i];
    const filteredRows = rows.filter(row => {
      const name = String(row.categoryName || "").trim();
      return !garbagePatterns.some(p => p.test(name));
    });

    // Build computed items with index tracking
    const computed = filteredRows.map((row, idx) => {
      const lvl = Number(row.level ?? 0);
      const hasManual = Number(row.manualValues) === 1;
      return {
        id: Number(row.id),
        index: idx,
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

    // Step 1: Compute leaf items (non-sections with matchField)
    for (const item of computed) {
      if (item.manualValues) continue; // Use Excel values
      if (item.matchField) {
        const stats = await countByFilter(type, item.matchField, item.matchMode, item.matchValue);
        item.rollers = stats.rollers;
        item.seconds = stats.seconds;
      }
    }

    // Step 2: Determine which items are sections (have children at higher levels)
    // An item is a section if the next item has a higher level
    function isSection(idx: number): boolean {
      if (idx + 1 >= computed.length) return false;
      return computed[idx + 1].level > computed[idx].level;
    }

    // Step 3: Bottom-up: compute section totals from deepest to shallowest
    // Only sum DIRECT children (level + 1), not all descendants
    const maxLevel = Math.max(...computed.map(i => i.level));
    for (let targetLevel = maxLevel; targetLevel >= 1; targetLevel--) {
      for (let i = 0; i < computed.length; i++) {
        const item = computed[i];
        if (item.level !== targetLevel) continue;
        if (!isSection(i)) continue; // Not a section (no children)
        if (item.manualValues) continue; // Keep Excel manual values as-is

        // Sum direct children only (level + 1)
        let tr = 0, ts = 0;
        for (let j = i + 1; j < computed.length; j++) {
          if (computed[j].level <= item.level) break;
          if (computed[j].level === item.level + 1) {
            tr += computed[j].rollers;
            ts += computed[j].seconds;
          }
        }

        if (item.level === 1) {
          item.rollers = tr;
          item.seconds = totalSeconds;
          item.percent = 100;
        } else {
          item.rollers = tr;
          item.seconds = ts;
          item.percent = totalSeconds > 0 ? Math.round((ts / totalSeconds) * 10000) / 100 : 0;
        }
      }
    }

    // Step 4: Compute percentages for non-section leaves
    for (let i = 0; i < computed.length; i++) {
      const item = computed[i];
      if (isSection(i)) continue; // Sections already have their percent
      if (item.level === 1) continue;
      item.percent = totalSeconds > 0 ? Math.round((item.seconds / totalSeconds) * 10000) / 100 : 0;
    }

    // Step 5: Clean garbage rows from DB (persistent cleanup)
    try {
      const dbRows = await db.execute({ sql: `SELECT "id", "categoryName" FROM "PlaylistSummary" WHERE "type"=:type`, args: { type } });
      for (const row of dbRows.rows) {
        const name = String(row.categoryName || "").trim();
        if (garbagePatterns.some(p => p.test(name))) {
          await db.execute({ sql: `DELETE FROM "PlaylistSummary" WHERE "id"=:id`, args: { id: Number(row.id) } });
          console.log(`[Summary] Cleaned garbage row id=${row.id}: "${name}"`);
        }
      }
    } catch (e) {
      console.warn("[Summary] Garbage cleanup warning:", e);
    }

    // Step 6: Self-validation
    const validation = await validateData(type, computed);

    return NextResponse.json({ items: computed, totalSeconds, validation });
  } catch (error) { console.error("Error computing summary:", error); return NextResponse.json({ error: "Failed", details: String(error) }, { status: 500 }); }
}
