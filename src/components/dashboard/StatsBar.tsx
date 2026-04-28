"use client";

import { Film, Clock, MapPin, Layers, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaylistStats } from "./types";

interface StatsBarProps {
  stats: PlaylistStats | null;
  loading: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading && !stats) {
    return (
      <div className="hidden md:flex items-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-md" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items = [
    { icon: Film, label: "Записей", value: stats.totalRecords.toLocaleString("ru-RU") },
    { icon: Clock, label: "Хроно", value: stats.totalSecondsFormatted },
    { icon: MapPin, label: "Локаций", value: stats.transportStats.length.toString() },
    { icon: Layers, label: "Категорий", value: stats.categoryStats.length.toString() },
    { icon: Users, label: "Заказчиков", value: stats.uniqueClients.length.toString() },
  ];

  return (
    <div className="hidden md:flex items-center gap-2.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 backdrop-blur-sm ring-1 ring-white/5"
        >
          <div className="w-5 h-5 rounded bg-white/15 flex items-center justify-center">
            <item.icon className="w-2.5 h-2.5 text-white/90" />
          </div>
          <span className="text-sm font-bold text-white tabular-nums">{item.value}</span>
          <span className="text-[10px] text-white/40 font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
