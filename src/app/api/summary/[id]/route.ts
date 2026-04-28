import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/summary/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, level, categoryName, description, rollers, seconds, percent } = body;

    const fields: string[] = [];
    const values: Record<string, string | number | boolean | null> = { id: parseInt(id) };

    if (type !== undefined) { fields.push('"type" = :type'); values.type = type; }
    if (level !== undefined) { fields.push('"level" = :level'); values.level = parseInt(level); }
    if (categoryName !== undefined) { fields.push('"categoryName" = :categoryName'); values.categoryName = categoryName; }
    if (description !== undefined) { fields.push('"description" = :description'); values.description = description; }
    if (rollers !== undefined) { fields.push('"rollers" = :rollers'); values.rollers = parseInt(rollers); }
    if (seconds !== undefined) { fields.push('"seconds" = :seconds'); values.seconds = parseInt(seconds); }
    if (percent !== undefined) { fields.push('"percent" = :percent'); values.percent = parseFloat(percent); }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    fields.push('"updatedAt" = datetime(\'now\')');
    await db.execute({
      sql: `UPDATE "PlaylistSummary" SET ${fields.join(", ")} WHERE "id" = :id`,
      args: values,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating summary entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/summary/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.execute({
      sql: `DELETE FROM "PlaylistSummary" WHERE "id" = :id`,
      args: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting summary entry:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
