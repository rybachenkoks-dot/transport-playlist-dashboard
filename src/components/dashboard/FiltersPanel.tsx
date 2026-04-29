"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { PlaylistStats, FilterState, PlaylistConfig } from "./types";

interface FiltersPanelProps {
  filters: FilterState;
  stats: PlaylistStats | null;
  config: PlaylistConfig;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

export function FiltersPanel({ filters, stats, config, onFilterChange }: FiltersPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = filters.location || filters.category || filters.client || filters.search;
  const clearFilters = () => onFilterChange({ location: "", category: "", client: "", search: "" });
  const locations = stats?.transportStats.map((t) => t.location) || [];
  const categories = stats?.categoryStats.map((c) => c.category) || [];
  const clients = stats?.uniqueClients || [];

  return (
    <div className={`rounded-xl border ${config.borderColor} bg-white shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input placeholder="Поиск..." className="h-9 pl-9 text-sm bg-stone-50/50 border-stone-200 focus-visible:ring-stone-300" value={filters.search} onChange={(e) => onFilterChange({ search: e.target.value })} />
        </div>
        <div className="flex-1" />
        <Button variant={hasActiveFilters ? "secondary" : "ghost"} size="sm" className="h-9 gap-1.5 text-xs rounded-lg" onClick={() => setExpanded(!expanded)}>
          <SlidersHorizontal className="w-3.5 h-3.5" /> Фильтры
          {hasActiveFilters && <span className="w-4 h-4 rounded-full bg-stone-700 text-white text-[9px] font-bold flex items-center justify-center ml-0.5">!</span>}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground rounded-lg">
            <X className="w-3.5 h-3.5 mr-1" /> Сбросить
          </Button>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-stone-100">
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{config.locationLabel}</label>
              <Select value={filters.location} onValueChange={(v) => onFilterChange({ location: v === "__all__" ? "" : v })}>
                <SelectTrigger className="h-8 w-40 text-xs bg-stone-50/30"><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Все</SelectItem>{locations.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{config.categoryLabel}</label>
              <Select value={filters.category} onValueChange={(v) => onFilterChange({ category: v === "__all__" ? "" : v })}>
                <SelectTrigger className="h-8 w-40 text-xs bg-stone-50/30"><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Все</SelectItem>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{config.clientLabel}</label>
              <Select value={filters.client} onValueChange={(v) => onFilterChange({ client: v === "__all__" ? "" : v })}>
                <SelectTrigger className="h-8 w-52 text-xs bg-stone-50/30"><SelectValue placeholder="Все" /></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Все</SelectItem>{clients.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
