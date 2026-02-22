// Shared types between backend and frontend
export interface CacheEntry {
  tier: string;
  updated: number;
}

export interface Cache {
  [appid: string]: CacheEntry;
}

export interface Settings {
  enabledBadges: string[];
  installedOnly: boolean;
  autoSync: boolean;
  // Advanced tuning (optional)
  concurrency?: number;
  minIntervalMs?: number;
  maxCacheEntries?: number;
}

export type Buckets = {
  [badge: string]: number[];
};
