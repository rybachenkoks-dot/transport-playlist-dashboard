"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Clock, Film, AlertTriangle, ShieldCheck } from "lucide-react";
import type { PlaylistType, PlaylistConfig } from "./types";

interface SummaryItem {
  id: number; level: number; name: string; description: string;
  rollers: number; seconds: number; percent: number;
  isSection: boolean; manualValues: boolean;
  children?: SummaryItem[];
}

interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  details?: string;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  if (h > 0) return `${h}ч ${m}м`; if (m > 0) return `${m}м ${sec}с`; return `${sec}с`;
}

export function SummaryDialog({ open, onClose, type, config }: { open: boolean; onClose: () => void; type: PlaylistType; config: PlaylistConfig }) {
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [validation, setValidation] = useState<ValidationIssue[]>([]);
  const [showValidation, setShowValidation] = useState(false);
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
      setValidation(data.validation || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Неизвестная ошибка"); setItems([]); }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { if (open && !prevOpen.current) fetchSummary(); prevOpen.current = open; }, [open, fetchSummary]);

  const totalItem = items.find(i => i.level === 1);
  const errors = validation.filter(v => v.severity === "error");
  const warnings = validation.filter(v => v.severity === "warning");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] p-0 gap-0 overflow-hidden rounded-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.headerGradient} px-5 pt-4 pb-3 shrink-0`}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 6v12M15 6v12" /></svg>
              Свод — {config.label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[11px] text-white/50">
              {totalSeconds > 0 ? `Итого: ${formatDuration(totalSeconds)}` : "Нет данных"}
            </p>
            {validation.length > 0 && (
              <button
                onClick={() => setShowValidation(!showValidation)}
                className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition-colors"
              >
                {errors.length > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-300" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>{errors.length > 0 ? `${errors.length} ошибок` : `${warnings.length} замечаний`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Validation panel */}
        {showValidation && validation.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200/60 shrink-0">
            <p className="text-[11px] font-semibold text-amber-700 mb-1.5">Проверка данных</p>
            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {validation.map((v, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                  {v.severity === "error" ? (
                    <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className={v.severity === "error" ? "text-red-700" : "text-amber-700"}>{v.message}</span>
                    {v.details && <span className="text-amber-600 block text-[10px] mt-0.5">{v.details}</span>}
                  </div>
                </div>
              ))}
              {validation.length === 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Данные корректны, проблем не обнаружено</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-5 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-md" />)}</div>
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
            <div className="p-4">
              {/* Total row */}
              {totalItem && (
                <div className="grid grid-cols-[1fr_100px_100px_80px] gap-3 px-3 py-2.5 rounded-lg bg-stone-100/70 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 rounded-full bg-stone-400 shrink-0" />
                    <span className="font-bold text-sm text-stone-800">{totalItem.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-right">
                    <Film className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-sm font-bold text-stone-700 tabular-nums">{totalItem.rollers}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-right">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-sm font-bold text-stone-700 tabular-nums">{formatDuration(totalItem.seconds)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-600 tabular-nums">{totalItem.percent}%</span>
                  </div>
                </div>
              )}

              {/* Table header for level 2+ rows */}
              <div className="grid grid-cols-[1fr_100px_100px_80px] gap-3 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-stone-200/60 mb-0.5">
                <span>Категория</span>
                <span className="text-right">Ролики</span>
                <span className="text-right">Длительность</span>
                <span className="text-right">%</span>
              </div>

              {/* Level 2+ rows */}
              {items.filter(i => i.level >= 2).map(item => {
                const isSection = item.level === 2;
                const indent = (item.level - 2) * 20;
                const desc = item.description && item.description.trim().length > 0 && item.description !== item.name
                  ? item.description.trim()
                  : null;

                return (
                  <div
                    key={item.id}
                    className={`group/row grid grid-cols-[1fr_100px_100px_80px] gap-3 px-3 py-2 transition-colors hover:bg-stone-50/80 ${isSection ? "border-b border-stone-100/50" : ""}`}
                  >
                    {/* Name column — hover tooltip on entire row */}
                    <div className={`relative flex items-center gap-2 min-w-0 ${desc ? "cursor-help" : ""}`}>
                      <div style={{ width: `${indent}px`, minWidth: `${indent}px` }} />
                      <div className={`w-1 h-4 rounded-full shrink-0 ${
                        item.level === 2 ? "bg-emerald-400" :
                        item.level === 3 ? "bg-amber-400" :
                        "bg-stone-300"
                      }`} />
                      <span className={`text-[13px] leading-tight truncate ${isSection ? "font-semibold text-stone-800" : "text-stone-600"}`}>
                        {item.name}
                      </span>
                      {desc && (
                        <Info className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      {/* Tooltip — appears on hover of the entire name cell */}
                      {desc && (
                        <div className="pointer-events-none absolute bottom-full left-2 mb-2 px-3 py-2.5 rounded-lg bg-stone-800 text-white text-[11px] leading-relaxed whitespace-pre-wrap max-w-[440px] min-w-[180px] shadow-xl opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 z-50">
                          <p className="font-semibold text-[12px] mb-1 text-stone-200">{item.name}</p>
                          <p className="text-stone-300">{desc}</p>
                          <div className="absolute top-full left-4 -mt-px w-2 h-2 rotate-45 bg-stone-800" />
                        </div>
                      )}
                    </div>

                    {/* Rollers — right-aligned */}
                    <div className={`flex items-center justify-end tabular-nums text-[13px] ${isSection ? "font-semibold text-stone-700" : "text-stone-500"}`}>
                      {item.rollers > 0 ? item.rollers : "—"}
                    </div>

                    {/* Duration — right-aligned */}
                    <div className={`flex items-center justify-end tabular-nums text-[13px] ${isSection ? "font-semibold text-stone-700" : "text-stone-500"}`}>
                      {item.seconds > 0 ? formatDuration(item.seconds) : "—"}
                    </div>

                    {/* Percent — right-aligned */}
                    <div className={`flex items-center justify-end tabular-nums text-[13px] ${isSection ? "font-bold text-emerald-600" : "text-stone-400"}`}>
                      {item.percent > 0 ? `${item.percent}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
