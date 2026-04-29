export interface PlaylistEntry {
  id: number;
  originalIndex: number;
  type: string;
  location: string;
  category: string;
  client: string;
  mediaObject: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationStat {
  location: string;
  count: number;
  duration: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  duration: number;
}

export interface PlaylistStats {
  totalRecords: number;
  totalDuration: number;
  totalSecondsFormatted: string;
  transportStats: LocationStat[];
  categoryStats: CategoryStat[];
  uniqueClients: string[];
}

export interface FilterState {
  location: string;
  category: string;
  client: string;
  search: string;
  page: number;
  limit: number;
}

export interface SummaryEntry {
  id: number;
  type: string;
  level: number;
  categoryName: string;
  description: string;
  rollers: number;
  seconds: number;
  percent: number;
  createdAt: string;
  updatedAt: string;
}

export type PlaylistType = 'transport' | 'mfc' | 'metro' | 'lift' | 'kd';

export interface PlaylistConfig {
  type: PlaylistType;
  label: string;
  subtitle: string;
  locationLabel: string;
  categoryLabel: string;
  clientLabel: string;
  mediaLabel: string;
  headerGradient: string;
  accentColor: string;
  buttonGradient: string;
  dotColor: string;
  borderColor: string;
  iconBg: string;
}
