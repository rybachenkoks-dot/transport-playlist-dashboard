import { db, ensureTables } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["transport", "mfc", "metro", "lift", "kd"];

// GET /api/playlist
export async function GET(request: NextRequest) {
  try {
    await ensureTables();
    const sp = request.nextUrl.searchParams;
    const type = sp.get("type");

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Параметр type обязателен" }, { status: 400 });
    }

    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "50");
    const offset = (page - 1) * limit;

    const location = sp.get("location") || "";
    const category = sp.get("category") || "";
    const client = sp.get("client") || "";
    const search = sp.get("search") || "";

    // Build dynamic query with named params
    const conditions: string[] = [];
    const args: Record<string, string | number | boolean | null> = { type };

    conditions.push('"type" = :type');

    if (location) {
      conditions.push('"location" = :location');
      args.location = location;
    }
    if (category) {
      conditions.push('"category" = :category');
      args.category = category;
    }
    if (client) {
      conditions.push('"client" = :client');
      args.client = client;
    }
    if (search) {
      conditions.push('("client" LIKE :search1 OR "mediaObject" LIKE :search2)');
      args.search1 = `%${search}%`;
      args.search2 = `%${search}%`;
    }

    const whereClause = conditions.join(" AND ");

    const [countResult, items] = await Promise.all([
      db.execute({
        sql: `SELECT COUNT(*) as count FROM "Playlist" WHERE ${whereClause}`,
        args,
      }),
      db.execute({
        sql: `SELECT * FROM "Playlist" WHERE ${whereClause} ORDER BY "id" DESC LIMIT :limit OFFSET :offset`,
        args: { ...args, limit, offset },
      }),
    ]);

    const total = Number(countResult.rows[0].count);

    return NextResponse.json({
      items: items.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

// POST /api/playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, location, category, client, mediaObject, duration } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Параметр type обязателен" }, { status: 400 });
    }

    if (!category || !client || !mediaObject || duration === undefined) {
      return NextResponse.json({ error: "Все поля обязательны" }, { status: 400 });
    }

    const maxResult = await db.execute({
      sql: `SELECT MAX("originalIndex") as maxIdx FROM "Playlist" WHERE "type" = :type`,
      args: { type },
    });
    const nextIndex = (Number(maxResult.rows[0]?.maxIdx) || 0) + 1;

    await db.execute({
      sql: `INSERT INTO "Playlist" ("originalIndex", "type", "location", "category", "client", "mediaObject", "duration", "createdAt", "updatedAt") VALUES (:idx, :type, :location, :category, :client, :mediaObject, :dur, datetime('now'), datetime('now'))`,
      args: { idx: nextIndex, type, location: location || "", category, client, mediaObject, dur: parseInt(duration) },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
