"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORY_STYLES } from "./config";
import type { PlaylistEntry, PlaylistConfig } from "./types";

interface PlaylistTableProps {
  entries: PlaylistEntry[]; loading: boolean; total: number; page: number; totalPages: number; config: PlaylistConfig; onPageChange: (page: number) => void;
}

export function PlaylistTable({ entries, loading, total, page, totalPages, config, onPageChange }: PlaylistTableProps) {
  if (loading) {
    return (
      <div className={`rounded-xl border ${config.borderColor} bg-white shadow-sm overflow-hidden`}>
        <div className="p-5 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-1.5">
              <Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-24 rounded-full" /><Skeleton className="h-4 w-20 rounded-full" /><Skeleton className="h-4 w-36" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${config.borderColor} bg-white shadow-sm overflow-hidden`}>
      <div className="overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader>
            <TableRow className="border-stone-100/40 hover:bg-transparent">
              <TableHead className="w-14 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">#</TableHead>
              <TableHead className="min-w-[120px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{config.locationLabel}</TableHead>
              <TableHead className="min-w-[110px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{config.categoryLabel}</TableHead>
              <TableHead className="min-w-[150px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client</TableHead>
              <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{config.mediaLabel}</TableHead>
              <TableHead className="w-[80px] text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dur</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-16"><p className="text-muted-foreground text-sm">No records</p><p className="text-muted-foreground text-xs mt-1">Upload via Import button</p></TableCell></TableRow>
            ) : (
              entries.map((entry) => {
                const catStyle = CATEGORY_STYLES[entry.category.trim()];
                return (
                  <TableRow key={entry.id} className="border-stone-50/60">
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">{entry.originalIndex}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${config.dotColor} shrink-0`} /><span className="text-sm font-medium">{entry.location}</span></div></TableCell>
                    <TableCell>{catStyle ? (<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${catStyle.bg} ${catStyle.text}`}><span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />{entry.category.trim()}</span>) : (<span className="text-sm text-muted-foreground">{entry.category.trim()}</span>)}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">{entry.client}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[320px] truncate">{entry.mediaObject}</TableCell>
                    <TableCell className="text-center"><span className="inline-flex items-center justify-center min-w-[32px] h-6 px-1.5 rounded-md bg-stone-100 text-stone-700 text-xs font-bold tabular-nums">{entry.duration}</span></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-stone-100/40 px-4 py-2.5 flex items-center justify-between bg-stone-50/30">
        <span className="text-xs text-muted-foreground tabular-nums">{entries.length} / {total}</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page <= 1}><ChevronLeft className="w-3.5 h-3.5" /><ChevronLeft className="w-3.5 h-3.5 -ml-2" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page <= 1}><ChevronLeft className="w-3.5 h-3.5" /></Button>
          <span className="text-xs text-muted-foreground px-2 font-mono tabular-nums">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}><ChevronRight className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}><ChevronRight className="w-3.5 h-3.5" /><ChevronRight className="w-3.5 h-3.5 -ml-2" /></Button>
        </div>
      </div>
    </div>
  );
}
