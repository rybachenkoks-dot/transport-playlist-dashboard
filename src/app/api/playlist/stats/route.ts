import { db, ensureTables } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["transport", "mfc", "metro", "lift", "kd"];

// GET /api/playlist/stats
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const type = request.nextUrl.searchParams.get("type");

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Параметр type обязателен" }, { status: 400 });
    }

    const [totalResult, durationResult, locationStats, categoryStats] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) as count FROM "Playlist" WHERE "type" = :type`, args: { type } }),
      db.execute({ sql: `SELECT COALESCE(SUM("duration"), 0) as total FROM "Playlist" WHERE "type" = :type`, args: { type } }),
      db.execute({
        sql: `SELECT "location", COUNT(*) as count, COALESCE(SUM("duration"), 0) as duration FROM "Playlist" WHERE "type" = :type GROUP BY "location" ORDER BY count DESC`,
        args: { type },
      }),
      db.execute({
        sql: `SELECT "category", COUNT(*) as count, COALESCE(SUM("duration"), 0) as duration FROM "Playlist" WHERE "type" = :type GROUP BY "category" ORDER BY count DESC`,
        args: { type },
      }),
    ]);

    const totalRecords = Number(totalResult.rows[0].count);
    const totalDuration = Number(durationResult.rows[0].total);
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);

    const uniqueClients = await db.execute({
      sql: `SELECT DISTINCT "client" FROM "Playlist" WHERE "type" = :type ORDER BY "client" ASC`,
      args: { type },
    });

    return NextResponse.json({
      totalRecords,
      totalDuration,
      totalSecondsFormatted: `${hours}ч ${minutes}м`,
      transportStats: locationStats.rows.map((r) => ({
        location: r.location as string,
        count: Number(r.count),
        duration: Number(r.duration),
      })),
      categoryStats: categoryStats.rows.map((r) => ({
        category: r.category as string,
        count: Number(r.count),
        duration: Number(r.duration),
      })),
      uniqueClients: uniqueClients.rows.map((r) => r.client as string),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
