"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Info, Clock, Film } from "lucide-react";
import type { PlaylistType, PlaylistConfig } from "./types";

interface SummaryItem {
  id: number; level: number; name: string; description: string;
  rollers: number; seconds: number; percent: number;
  isSection: boolean; manualValues: boolean;
  children?: SummaryItem[];
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  if (h > 0) return `${h}ч ${m}м`; if (m > 0) return `${m}м ${sec}с`; return `${sec}с`;
}

function TooltipBadge({ text }: { text: string }) {
  return (
    <div className="group/badge relative inline-flex">
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200/60 cursor-help transition-colors hover:bg-rose-100">
        <Info className="w-3 h-3 text-rose-500" />
        <span className="text-[9px] font-semibold text-rose-500 leading-none">наведи</span>
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-stone-800 text-white text-[11px] leading-relaxed whitespace-pre-wrap max-w-[320px] min-w-[200px] shadow-xl opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 bg-stone-800" />
      </div>
    </div>
  );
}

function RowItem({ item, totalSeconds, nestingOffset = 0 }: { item: SummaryItem; totalSeconds: number; nestingOffset?: number }) {
  const isTotal = item.level === 1;
  const isSection = item.level <= 2;
  const hasTooltip = item.description && item.description.trim().length > 0 && item.description !== item.name;
  const indent = nestingOffset * 12;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 transition-colors hover:bg-stone-50/80">
      {/* Indent */}
      <div style={{ width: `${indent}px`, minWidth: `${indent}px` }} />

      {/* Color indicator */}
      <div className={`w-1 h-5 rounded-full shrink-0 ${
        isTotal ? "bg-stone-400" :
        item.level === 2 ? "bg-emerald-400" :
        item.level === 3 ? "bg-amber-400" :
        "bg-stone-300"
      }`} />

      {/* Name + tooltip */}
      <div className="flex-1 flex items-center gap-1.5 overflow-hidden">
        <span className={`text-[13px] leading-tight ${isTotal ? "font-bold text-stone-800" : isSection ? "font-semibold text-stone-700" : "text-stone-600"}`}>
          {item.name}
        </span>
        {hasTooltip && <TooltipBadge text={item.description} />}
      </div>

      {/* Stats — compact inline */}
      <div className={`flex items-center gap-2 shrink-0 text-[11px] tabular-nums ${isSection ? "font-semibold" : "text-stone-500"}`}>
        <span className="flex items-center gap-0.5" title="Ролики">
          <Film className="w-3 h-3 opacity-40" />
          {item.rollers}
        </span>
        <span className="flex items-center gap-0.5" title="Длительность">
          <Clock className="w-3 h-3 opacity-40" />
          {formatDuration(item.seconds)}
        </span>
        {item.percent > 0 && (
          <span className={`${isSection ? "text-emerald-600 font-bold" : "text-stone-400"} min-w-[38px] text-right`}>
            {item.percent}%
          </span>
        )}
      </div>
    </div>
  );
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
      setItems(data.items || []);
      setTotalSeconds(data.totalSeconds || 0);
    } catch (e) { setError(e instanceof Error ? e.message : "Неизвестная ошибка"); setItems([]); }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { if (open && !prevOpen.current) fetchSummary(); prevOpen.current = open; }, [open, fetchSummary]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[720px] p-0 gap-0 overflow-hidden rounded-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.headerGradient} px-4 pt-4 pb-3 shrink-0`}>
          <div className="flex items-center justify-between">
            <div>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 6v12M15 6v12" /></svg>
                  Свод — {config.label}
                </DialogTitle>
              </DialogHeader>
              <p className="text-[10px] text-white/40 mt-0.5">
                {totalSeconds > 0 ? `Итого: ${formatDuration(totalSeconds)}` : "Нет данных"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => fetchSummary()} disabled={loading} className="h-7 gap-1 text-[11px] rounded-lg text-white/70 hover:text-white hover:bg-white/15">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>&#8635;</span>}
            </Button>
          </div>
        </div>

        {/* Hint bar */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-50/60 border-b border-rose-100/40 shrink-0">
            <Info className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="text-[10px] text-rose-500 font-medium">Наведите на розовую плашку у строки для подробностей</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}</div>
          ) : error ? (
            <div className="py-12 text-center px-4">
              <p className="text-destructive text-sm font-medium">Ошибка</p>
              <p className="text-muted-foreground text-xs mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchSummary}>Попробовать снова</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center px-4">
              <p className="text-muted-foreground text-sm">Нет данных</p>
              <p className="text-muted-foreground text-xs mt-1">Загрузите данные через кнопку Импорт</p>
            </div>
          ) : (
            <div className="py-1">
              {/* Total row */}
              {items.filter(i => i.level === 1).map(item => (
                <div key={item.id} className="flex items-center gap-1 px-3 py-2 bg-stone-100/60">
                  <div className="w-1 h-5 rounded-full bg-stone-400 shrink-0" />
                  <span className="font-bold text-sm text-stone-800 flex-1">{item.name}</span>
                  <div className="flex items-center gap-2 shrink-0 text-[11px] tabular-nums font-semibold">
                    <span className="flex items-center gap-0.5"><Film className="w-3 h-3 opacity-50" />{item.rollers}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 opacity-50" />{formatDuration(item.seconds)}</span>
                    <span className="text-emerald-600 font-bold min-w-[38px] text-right">{item.percent}%</span>
                  </div>
                </div>
              ))}

              {/* Divider */}
              <div className="mx-3 my-1 border-t border-stone-100" />

              {/* Level 2+ rows */}
              {items.filter(i => i.level >= 2).map(item => (
                <RowItem key={item.id} item={item} totalSeconds={totalSeconds} nestingOffset={item.level - 2} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
