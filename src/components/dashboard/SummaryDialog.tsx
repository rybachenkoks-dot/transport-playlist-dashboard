"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PlaylistType, PlaylistConfig } from "./types";

interface SummaryItem { id: number; level: number; name: string; description: string; rollers: number; seconds: number; percent: number; isSection: boolean; manualValues: boolean; }

function formatDuration(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  if (h > 0) return `${h}ч ${m}м ${sec}с`; if (m > 0) return `${m}м ${sec}с`; return `${sec}с`;
}

export function SummaryDialog({ open, onClose, type, config }: { open: boolean; onClose: () => void; type: PlaylistType; config: PlaylistConfig }) {
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevOpen = useRef(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/summary/compute?type=${type}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []); setTotalSeconds(data.totalSeconds || 0);
    } catch (e) { setError(e instanceof Error ? e.message : "Неизвестная ошибка"); setItems([]); }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { if (open && !prevOpen.current) fetchSummary(); prevOpen.current = open; }, [open, fetchSummary]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
        <div className={`bg-gradient-to-r ${config.headerGradient} px-5 pt-5 pb-4 flex items-center justify-between shrink-0`}>
          <div>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2 text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 6v12M15 6v12" /></svg>
                Свод — {config.label}
              </DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-white/40 mt-0.5">{items.length} строк / Итого: {formatDuration(totalSeconds)} ({totalSeconds}с)</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => fetchSummary()} disabled={loading} className="h-8 gap-1 text-xs rounded-lg text-white/70 hover:text-white hover:bg-white/15">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>&#8635;</span>} Обновить
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-5 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}</div>
          ) : error ? (
            <div className="py-16 text-center px-5">
              <p className="text-destructive text-sm font-medium">Ошибка</p>
              <p className="text-muted-foreground text-xs mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchSummary}>Попробовать снова</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">Нет данных</p>
              <p className="text-muted-foreground text-xs mt-1">Загрузите данные через кнопку Импорт</p>
            </div>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Table>
                <TableHeader>
                  <TableRow className="border-stone-100/40 hover:bg-transparent">
                    <TableHead className="w-9 text-center text-[11px] font-semibold text-muted-foreground uppercase">Ур.</TableHead>
                    <TableHead className="min-w-[200px] text-[11px] font-semibold text-muted-foreground uppercase">Категория</TableHead>
                    <TableHead className="w-[70px] text-center text-[11px] font-semibold text-muted-foreground uppercase">Ролики</TableHead>
                    <TableHead className="w-[70px] text-center text-[11px] font-semibold text-muted-foreground uppercase">Сек.</TableHead>
                    <TableHead className="w-[55px] text-center text-[11px] font-semibold text-muted-foreground uppercase">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isSection = item.level <= 2; const isTotal = item.level === 1;
                    return (
                      <TableRow key={item.id} className={`border-stone-50/60 ${isTotal ? "bg-stone-100/60 font-bold" : ""} ${isSection && !isTotal ? "bg-stone-50/40 font-semibold" : ""}`}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground py-1.5">{item.level}</TableCell>
                        <TableCell className="text-sm py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span style={{ paddingLeft: `${(item.level - 1) * 16}px` }} className={isSection ? "font-semibold" : "font-medium"}>{item.name}</span>
                            {item.description && item.description.trim().length > 0 && (
                              <Tooltip><TooltipTrigger asChild><span className="w-3 h-3 text-muted-foreground/50 shrink-0 cursor-help">i</span></TooltipTrigger><TooltipContent side="bottom" className="max-w-[350px] text-xs whitespace-pre-wrap">{item.description}</TooltipContent></Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-center text-sm tabular-nums py-1.5 ${isSection ? "font-semibold" : "font-medium"}`}>{item.rollers || (isSection ? "0" : "-")}</TableCell>
                        <TableCell className={`text-center text-sm tabular-nums py-1.5 ${isSection ? "font-semibold" : "font-medium"}`}>{item.seconds || (isSection ? "0" : "-")}</TableCell>
                        <TableCell className={`text-center text-sm tabular-nums py-1.5 ${isSection ? "font-bold" : ""}`}>{item.percent > 0 ? `${item.percent}%` : (isSection ? "0%" : "-")}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
