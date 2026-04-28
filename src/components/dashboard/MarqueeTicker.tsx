"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import type { PlaylistEntry, PlaylistType, PlaylistConfig } from "./types";

interface MarqueeTickerProps {
  activeType: PlaylistType;
  config: PlaylistConfig;
}

export function MarqueeTicker({ activeType, config }: MarqueeTickerProps) {
  const [entries, setEntries] = useState<PlaylistEntry[]>([]);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(`/api/playlist/recent?type=${activeType}`);
        const data = await res.json();
        setEntries(data);
      } catch { /* silent */ }
    };
    fetchRecent();
    const interval = setInterval(fetchRecent, 15000);
    return () => clearInterval(interval);
  }, [activeType]);

  if (entries.length === 0) return null;

  const allItems = [...entries, ...entries];

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-stone-50 via-white to-stone-50 border ${config.borderColor} shadow-sm`}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-stone-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-stone-50 to-transparent z-10 pointer-events-none" />

      <div className="flex items-center animate-marquee py-2.5 gap-3">
        {allItems.map((entry, index) => (
          <div
            key={`${entry.id}-${index}`}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/70 ring-1 ring-stone-200/50 shadow-sm hover:shadow transition-shadow shrink-0"
          >
            <div className={`w-1.5 h-5 rounded-full ${config.dotColor} shrink-0`} />
            <span className="text-xs text-muted-foreground font-medium hidden lg:inline w-16 truncate">
              {entry.location}
            </span>
            <span className="text-[13px] font-medium text-foreground max-w-[200px] truncate">
              {entry.mediaObject}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline max-w-[120px] truncate">
              {entry.client}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded-md tabular-nums">
              <Clock className="w-2.5 h-2.5" />
              {entry.duration}с
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
