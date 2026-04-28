import { db, ensureTables } from "@/lib/db";
import { NextResponse } from "next/server";

// DELETE /api/import/clear — delete all imported data
export async function DELETE() {
  try {
    await ensureTables();

    const result1 = await db.execute(`SELECT COUNT(*) as cnt FROM "Playlist"`);
    const result2 = await db.execute(`SELECT COUNT(*) as cnt FROM "PlaylistSummary"`);
    const playlistCount = result1.rows[0]?.cnt ?? 0;
    const summaryCount = result2.rows[0]?.cnt ?? 0;

    await db.execute(`DELETE FROM "Playlist"`);
    await db.execute(`DELETE FROM "PlaylistSummary"`);

    console.log(`[Clear] Deleted ${playlistCount} playlist rows and ${summaryCount} summary rows`);

    return NextResponse.json({
      success: true,
      deletedPlaylists: Number(playlistCount),
      deletedSummaries: Number(summaryCount),
    });
  } catch (error) {
    console.error("[Clear] Error:", error);
    return NextResponse.json(
      { error: "Ошибка при очистке данных" },
      { status: 500 }
    );
  }
}
