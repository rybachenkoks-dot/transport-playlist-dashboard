"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationTabs } from "@/components/dashboard/NavigationTabs";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { MarqueeTicker } from "@/components/dashboard/MarqueeTicker";
import { PlaylistTable } from "@/components/dashboard/PlaylistTable";
import { FiltersPanel } from "@/components/dashboard/FiltersPanel";
import { SummaryDialog } from "@/components/dashboard/SummaryDialog";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { PLAYLIST_CONFIGS } from "@/components/dashboard/config";
import type { PlaylistEntry, PlaylistStats, FilterState, PlaylistType, PlaylistConfig } from "@/components/dashboard/types";

export default function Dashboard() {
  const [activeType, setActiveType] = useState<PlaylistType>("transport");
  const config: PlaylistConfig = PLAYLIST_CONFIGS[activeType];
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);
  const [stats, setStats] = useState<PlaylistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterState>({ location: "", category: "", client: "", search: "", page: 1, limit: 50 });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", activeType);
      if (filters.location) params.set("location", filters.location);
      if (filters.category) params.set("category", filters.category);
      if (filters.client) params.set("client", filters.client);
      if (filters.search) params.set("search", filters.search);
      params.set("page", filters.page.toString());
      params.set("limit", filters.limit.toString());
      const res = await fetch(`/api/playlist?${params}`);
      const data = await res.json();
      setEntries(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch { toast.error("Ошибка загрузки данных"); }
    finally { setLoading(false); }
  }, [activeType, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/playlist/stats?type=${activeType}`);
      const data = await res.json();
      setStats(data);
    } catch { toast.error("Ошибка загрузки статистики"); }
  }, [activeType]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleTypeChange = (type: PlaylistType) => {
    setActiveType(type);
    setFilters({ location: "", category: "", client: "", search: "", page: 1, limit: 50 });
    setEntries([]); setStats(null);
  };

  const handleFilterChange = (f: Partial<FilterState>) => setFilters((p) => ({ ...p, ...f, page: 1 }));
  const handleImported = () => { fetchEntries(); fetchStats(); };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-stone-50 via-rose-50/30 to-amber-50/20">
      <main className="flex-1 px-4 md:px-6 lg:px-8 py-5 max-w-[1600px] mx-auto w-full space-y-4">
        <NavigationTabs activeType={activeType} onChange={handleTypeChange} />
        <div className="rounded-xl overflow-hidden shadow-md">
          <div className={`bg-gradient-to-r ${config.headerGradient} px-5 py-5 flex items-center justify-between`}>
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-xl ${config.iconBg} backdrop-blur-sm flex items-center justify-center ring-1 ring-white/10`}>
                <svg className={`w-5 h-5 ${config.accentColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 17h8M8 17v-4m8 4v-4m-8 0h8M8 17l-2 3h12l-2-3" />
                  <circle cx="8" cy="9" r="2.5" /><circle cx="16" cy="9" r="2.5" />
                  <path strokeLinecap="round" d="M4 13h16" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Плейлист {config.label}</h1>
                <p className="text-[11px] text-white/40 font-medium">{config.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatsBar stats={stats} loading={loading} />
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} className="h-9 gap-1.5 text-xs rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                <Upload className="w-4 h-4" /><span className="hidden sm:inline">Импорт</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSummaryOpen(true)} className="h-9 gap-1.5 text-xs rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                <FileSpreadsheet className="w-4 h-4" /><span className="hidden sm:inline">Свод</span>
              </Button>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500" />
        </div>
        <MarqueeTicker activeType={activeType} config={config} />
        <div className="space-y-3">
          <FiltersPanel filters={filters} stats={stats} config={config} onFilterChange={handleFilterChange} />
          <PlaylistTable entries={entries} loading={loading} total={total} page={filters.page} totalPages={totalPages} config={config} onPageChange={(page) => handleFilterChange({ page })} />
        </div>
      </main>
      <footer className="border-t border-stone-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Плейлист {config.label} &copy; {new Date().getFullYear()}</span>
          <span className="text-xs font-medium bg-gradient-to-r from-stone-600 to-stone-500 bg-clip-text text-transparent">{total} записей</span>
        </div>
      </footer>
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} config={config} onImported={handleImported} />
      <SummaryDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} type={activeType} config={config} />
    </div>
  );
}
