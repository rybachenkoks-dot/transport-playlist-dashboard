import { db, ensureTables } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["transport", "mfc", "metro", "lift", "kd"];

// GET /api/playlist/recent
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const type = request.nextUrl.searchParams.get("type");

    let result;
    if (type && VALID_TYPES.includes(type)) {
      result = await db.execute({
        sql: `SELECT * FROM "Playlist" WHERE "type" = :type ORDER BY "id" DESC LIMIT 100`,
        args: { type },
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM "Playlist" ORDER BY "id" DESC LIMIT 100`,
        args: {},
      });
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching recent entries:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
