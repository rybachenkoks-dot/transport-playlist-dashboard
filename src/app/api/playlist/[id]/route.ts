import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/playlist/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db.execute({
      sql: `SELECT * FROM "Playlist" WHERE "id" = :id`,
      args: { id: parseInt(id) },
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PUT /api/playlist/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, location, category, client, mediaObject, duration } = body;

    const fields: string[] = [];
    const values: Record<string, string | number | boolean | null> = { id: parseInt(id) };

    if (type !== undefined) { fields.push('"type" = :type'); values.type = type; }
    if (location !== undefined) { fields.push('"location" = :location'); values.location = location; }
    if (category !== undefined) { fields.push('"category" = :category'); values.category = category; }
    if (client !== undefined) { fields.push('"client" = :client'); values.client = client; }
    if (mediaObject !== undefined) { fields.push('"mediaObject" = :mediaObject'); values.mediaObject = mediaObject; }
    if (duration !== undefined) { fields.push('"duration" = :duration'); values.duration = parseInt(duration); }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push('"updatedAt" = datetime(\'now\')');
    await db.execute({
      sql: `UPDATE "Playlist" SET ${fields.join(", ")} WHERE "id" = :id`,
      args: values,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/playlist/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: `DELETE FROM "Playlist" WHERE "id" = :id`,
      args: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
