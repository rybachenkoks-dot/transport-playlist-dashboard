import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["transport", "mfc", "metro", "lift", "kd"];

// GET /api/summary
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Параметр type обязателен" }, { status: 400 });
    }

    const result = await db.execute({
      sql: `SELECT * FROM "PlaylistSummary" WHERE "type" = :type ORDER BY "id" ASC`,
      args: { type },
    });

    return NextResponse.json({ items: result.rows });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}

// POST /api/summary
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, level, categoryName, description, rollers, seconds, percent } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Параметр type обязателен" }, { status: 400 });
    }

    if (level === undefined || !categoryName) {
      return NextResponse.json({ error: "Поля level и categoryName обязательны" }, { status: 400 });
    }

    await db.execute({
      sql: `INSERT INTO "PlaylistSummary" ("type", "level", "categoryName", "description", "rollers", "seconds", "percent", "createdAt", "updatedAt") VALUES (:type, :level, :categoryName, :description, :rollers, :seconds, :percent, datetime('now'), datetime('now'))`,
      args: { type, level: parseInt(level), categoryName, description: description || "", rollers: parseInt(rollers) || 0, seconds: parseInt(seconds) || 0, percent: parseFloat(percent) || 0 },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating summary entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
