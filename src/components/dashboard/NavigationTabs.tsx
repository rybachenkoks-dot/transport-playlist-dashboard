"use client";

import { PLAYLIST_CONFIGS, PLAYLIST_TYPES } from "./config";
import type { PlaylistType } from "./types";

interface NavigationTabsProps {
  activeType: PlaylistType;
  onChange: (type: PlaylistType) => void;
}

export function NavigationTabs({ activeType, onChange }: NavigationTabsProps) {
  return (
    <nav className="rounded-xl overflow-hidden border border-stone-200/80 bg-white shadow-sm" aria-label="Playlist types">
      <div className="flex">
        {PLAYLIST_TYPES.map((type) => {
          const config = PLAYLIST_CONFIGS[type];
          const isActive = activeType === type;

          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all flex-1 justify-center
                ${isActive
                  ? `bg-gradient-to-br ${config.headerGradient} text-white`
                  : "text-muted-foreground hover:text-foreground hover:bg-stone-50"
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-white/80" : config.dotColor}`}
              />
              <span className="hidden sm:inline">{config.label}</span>
              <span className="sm:hidden text-xs">{config.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
