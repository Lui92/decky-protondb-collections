/**
 * Backend implementation for Decky plugin.
 * Responsibilities:
 * - Fetch ProtonDB badge summaries and cache them
 * - Generate Steam collections grouped by badge tier
 * - Optionally sync collections with Tab Master plugin
 * - Persist settings and cache to disk
 *
 * Note: This file is written to be framework-agnostic: you'll need to wire it
 * into Decky's server API / plugin lifecycle (onLoad / onUnload) when installing.
 */

import fs from "fs";
import path from "path";
// Use native fetch when available (Node 18+), otherwise fall back to node-fetch.
let fetchLib: any = null;
let fetchLibInitialized = false;

function getFetchLib() {
  if (!fetchLibInitialized) {
    try {
      fetchLib = (globalThis as any).fetch || require('node-fetch');
    } catch (e) {
      // If require fails, try to use global fetch; otherwise fetch will be undefined and
      // httpGetJson will throw on use.
      fetchLib = (globalThis as any).fetch;
    }
    fetchLibInitialized = true;
  }
  return fetchLib;
}

import EventEmitter from "eventemitter3";
import { Cache, CacheEntry, Settings, Buckets } from "./types";
import { logger } from "./logger";

const DATA_PATH = process.env.DECKY_PLUGIN_DATA_PATH || ".";
const CACHE_FILE = path.join(DATA_PATH, "proton_cache.json");
const SETTINGS_FILE = path.join(DATA_PATH, "settings.json");

// Default badges we support. Keep consistent with frontend.
const DEFAULT_BADGES = ["platinum", "gold", "silver", "bronze", "borked"];

// Note: we implement a rate-limited HTTP helper inside the Plugin class below.

export default class Plugin extends EventEmitter {
  private cache: Cache = {};
  private settings: Settings = {
    enabledBadges: DEFAULT_BADGES.slice(),
    installedOnly: false,
    autoSync: false,
  };

  // External integration points (set by host runtime)
  public steam: any = null; // expected to be injected: getOwnedAppIds, getInstalledAppIds, setCollection, isPluginInstalled, callPlugin, onLibraryChanged

  private refreshing = false;

  constructor() {
    super();
    logger.logStartAction("Plugin", "initialization");
    this.loadCache();
    this.loadSettings();
    logger.info("Plugin constructor completed", { component: "Plugin", action: "initialization" });
  }

  // Simple request scheduler to avoid hammering ProtonDB for very large libraries.
  // maxConcurrent controls parallel HTTP requests; minIntervalMs enforces a small
  // delay between requests to respect rate-limits.
  private maxConcurrentRequests = 6;
  private currentRequests = 0;
  private minIntervalMs = 200; // 5 requests/sec baseline
  private lastRequestAt = 0;
  private maxCacheEntries = 2000;

  private async httpGetJson(url: string, retries = 2, delay = 400): Promise<any> {
    // Acquire slot
    while (this.currentRequests >= this.maxConcurrentRequests) {
      await new Promise((r) => setTimeout(r, 50));
    }
    // Enforce minimum interval between requests
    const waitFor = Math.max(0, this.minIntervalMs - (Date.now() - this.lastRequestAt));
    if (waitFor > 0) await new Promise((r) => setTimeout(r, waitFor));

    this.currentRequests++;
    this.lastRequestAt = Date.now();
    const startTime = Date.now();

    let lastErr: any = null;
    try {
      for (let i = 0; i <= retries; i++) {
        try {
          logger.logHttpRequest(url, "GET", i + 1);
          const fetch = getFetchLib();
          const res = await fetch(url, { timeout: 10000 } as any);
          if (!res || !res.ok) {
            const status = res && res.status ? res.status : 'NO_RESPONSE';
            const statusText = res && res.statusText ? res.statusText : '';
            logger.logHttpError(url, `HTTP ${status} ${statusText}`);
            throw new Error(`HTTP ${status} ${statusText} for ${url}`);
          }
          const duration = Date.now() - startTime;
          logger.logHttpResponse(url, res.status, res.statusText, duration);
          return await res.json();
        } catch (err) {
          lastErr = err;
          if (i < retries) {
            logger.debug(`HTTP request attempt ${i + 1} failed, retrying...`, { component: "HTTP", url });
            await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
          }
          // On repeated failures, slightly reduce concurrency to be kinder to API
          try {
            this.maxConcurrentRequests = Math.max(1, this.maxConcurrentRequests - 1);
          } catch {}
        }
      }
      logger.logHttpError(url, lastErr);
      throw lastErr;
    } finally {
      this.currentRequests = Math.max(0, this.currentRequests - 1);
    }
  }

  // Load cache from disk if available
  loadCache() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        logger.debug(`Loading cache from ${CACHE_FILE}`, { component: "Cache", action: "load" });
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        this.cache = JSON.parse(raw) as Cache;
        logger.logCacheOperation("load", true, { entries: Object.keys(this.cache).length });
      } else {
        logger.debug(`Cache file not found at ${CACHE_FILE}, starting fresh`, { component: "Cache" });
      }
    } catch (err) {
      // On parse failure, start with empty cache but keep running
      logger.logCacheOperation("load", false);
      logger.error("Failed to load cache", err, { component: "Cache" });
      this.cache = {};
    }
  }

  // Save cache to disk (sync to keep plugin robust)
  saveCache() {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
      logger.logCacheOperation("save", true, { entries: Object.keys(this.cache).length });
    } catch (err) {
      logger.logCacheOperation("save", false);
      logger.error("Failed to save cache", err, { component: "Cache" });
    }
  }

  loadSettings() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        logger.debug(`Loading settings from ${SETTINGS_FILE}`, { component: "Settings", action: "load" });
        const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
        this.settings = JSON.parse(raw) as Settings;
        logger.logSettingsOperation("load", true, { badges: this.settings.enabledBadges?.length || 0 });
        // Apply advanced settings if present
        if (typeof this.settings.concurrency === "number") this.maxConcurrentRequests = Math.max(1, Math.floor(this.settings.concurrency));
        if (typeof this.settings.minIntervalMs === "number") this.minIntervalMs = Math.max(0, Math.floor(this.settings.minIntervalMs));
        if (typeof this.settings.maxCacheEntries === "number") this.maxCacheEntries = Math.max(0, Math.floor(this.settings.maxCacheEntries));
      } else {
        logger.debug(`Settings file not found at ${SETTINGS_FILE}, using defaults`, { component: "Settings" });
      }
    } catch (err) {
      logger.logSettingsOperation("load", false);
      logger.error("Failed to load settings", err, { component: "Settings" });
    }
  }

  saveSettings() {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      logger.logSettingsOperation("save", true, { badges: this.settings.enabledBadges?.length || 0 });
    } catch (err) {
      logger.logSettingsOperation("save", false);
      logger.error("Failed to save settings", err, { component: "Settings" });
    }
  }

  async updateSettings(newSettings: Settings) {
    logger.logStartAction("Settings", "update");
    // minimal validation
    if (!Array.isArray(newSettings.enabledBadges)) newSettings.enabledBadges = DEFAULT_BADGES.slice();
    this.settings = newSettings;
    // update runtime knobs
    if (typeof this.settings.concurrency === "number") this.maxConcurrentRequests = Math.max(1, Math.floor(this.settings.concurrency));
    if (typeof this.settings.minIntervalMs === "number") this.minIntervalMs = Math.max(0, Math.floor(this.settings.minIntervalMs));
    if (typeof this.settings.maxCacheEntries === "number") this.maxCacheEntries = Math.max(0, Math.floor(this.settings.maxCacheEntries));
    this.saveSettings();
    logger.info("Settings updated", { component: "Settings", badges: this.settings.enabledBadges.length });
    this.emit("settingsUpdated", this.settings);
  }

  /**
   * Fetch ProtonDB badge tier for an appid. Uses local cache and persists to disk.
   * Returns a normalized lower-case tier or 'unknown' on error.
   */
  async fetchBadge(appid: number): Promise<string> {
    const id = String(appid);
    // return cached if present and not stale (e.g., 30 days)
    const entry = this.cache[id];
    const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
    if (entry && Date.now() - entry.updated < THIRTY_DAYS) {
      logger.logProtonDBFetch(appid, true, entry.tier);
      return entry.tier;
    }

    try {
      logger.logProtonDBFetch(appid, false);
      const url = `https://www.protondb.com/api/v1/reports/summaries/${id}.json`;
      const json = await this.httpGetJson(url, 2, 400);
      const tier = (json?.tier || "unknown").toString().toLowerCase();
      const newEntry: CacheEntry = { tier, updated: Date.now() };
      this.cache[id] = newEntry;
      logger.debug(`ProtonDB badge retrieved: ${tier}`, { component: "ProtonDB", appId: appid, tier });
      this.evictCacheIfNeeded();
      this.saveCache();
      return tier;
    } catch (err) {
      logger.logProtonDBError(appid, err as Error);
      return "unknown";
    }
  }

  // Remove oldest cache entries when cache exceeds configured size
  evictCacheIfNeeded() {
    try {
      const keys = Object.keys(this.cache);
      if (this.maxCacheEntries <= 0) return;
      if (keys.length <= this.maxCacheEntries) return;
      // sort keys by updated timestamp ascending
      keys.sort((a, b) => (this.cache[a].updated - this.cache[b].updated));
      const toRemove = keys.length - this.maxCacheEntries;
      for (let i = 0; i < toRemove; i++) {
        delete this.cache[keys[i]];
      }
      logger.logCacheOperation("evict", true, { removed: toRemove, remaining: this.maxCacheEntries });
    } catch (err) {
      logger.error("Cache eviction failed", err, { component: "Cache", action: "evict" });
    }
  }

  /**
   * Generate collections grouped by badge.
   * progressCallback(current, total) optional progress reporter.
   */
  async generateCollections(progressCallback?: (current: number, total: number) => void, concurrency = 6): Promise<Buckets | null> {
    if (this.refreshing) {
      logger.warn("Collection generation already in progress, skipping", undefined, { component: "Collections" });
      return null;
    }
    if (!this.steam || !this.steam.getOwnedAppIds) {
      logger.error("Steam integration not injected", new Error("Steam integration not injected"), { component: "Collections" });
      throw new Error("Steam integration not injected");
    }
    this.refreshing = true;

    try {
      const startTime = Date.now();
      logger.logStartAction("Collections", "generation", { concurrency });
      
      const apps: number[] = await this.steam.getOwnedAppIds();
      logger.info(`Fetched owned apps from Steam: ${apps.length} apps`, { component: "Steam", action: "getOwnedAppIds", appCount: apps.length });
      
      const installed: number[] = (this.steam.getInstalledAppIds && await this.steam.getInstalledAppIds()) || [];
      logger.info(`Fetched installed apps from Steam: ${installed.length} apps`, { component: "Steam", action: "getInstalledAppIds", appCount: installed.length });

      const buckets: Buckets = {};
      for (const b of this.settings.enabledBadges) buckets[b] = [];
      // Ensure 'unknown' bucket too
      if (!buckets["unknown"]) buckets["unknown"] = [];

      let count = 0;

      // Simple concurrency-limited worker pool
      const queue = apps.slice();
      const total = apps.length;

      const workers: Promise<void>[] = [];
      const doOne = async () => {
        while (true) {
          const app = queue.shift();
          if (app === undefined) break;

          // installed-only filter
          if (this.settings.installedOnly && !installed.includes(app)) {
            count++;
            progressCallback && progressCallback(count, total);
            continue;
          }

          try {
            const tier = await this.fetchBadge(app);
            if (buckets[tier]) buckets[tier].push(app);
            else buckets["unknown"].push(app);
          } catch (err) {
            // on per-app failure, put into unknown
            buckets["unknown"].push(app);
          }

          count++;
          progressCallback && progressCallback(count, total);
        }
      };

      for (let i = 0; i < concurrency; i++) workers.push(doOne());
      await Promise.all(workers);

      // Persist collections to Steam
      logger.info("Creating Steam collections...", { component: "Steam", action: "setCollection" });
      for (const tier in buckets) {
        try {
          const name = `ProtonDB - ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
          if (this.steam.setCollection) {
            await this.steam.setCollection(name, buckets[tier]);
            logger.logCollectionCreated(name, buckets[tier].length);
          }
        } catch (err) {
          logger.logCollectionFailed(`ProtonDB - ${tier}`, err as Error);
        }
      }

      // Optional Tab Master sync
      if (this.settings.autoSync) {
        logger.debug("Auto-sync enabled, syncing with TabMaster", { component: "Collections", autoSync: true });
        await this.syncTabMaster(buckets);
      }

      const duration = Date.now() - startTime;
      logger.logEndAction("Collections", "generation", duration, { tiers: Object.keys(buckets).length });
      this.emit("generated", buckets);
      return buckets;
    } finally {
      this.refreshing = false;
    }
  }

  async syncTabMaster(buckets: Buckets) {
    try {
      if (!this.steam || !this.steam.isPluginInstalled) {
        logger.debug("Steam integration not available, skipping TabMaster sync", { component: "TabMaster" });
        return;
      }
      
      const isTabMasterInstalled = this.steam.isPluginInstalled("TabMaster");
      if (!isTabMasterInstalled) {
        logger.info("TabMaster plugin not installed, skipping sync", { component: "TabMaster", plugin: "TabMaster" });
        return;
      }
      
      logger.logStartAction("TabMaster", "sync");

      for (const tier in buckets) {
        const tabName = `ProtonDB ${tier}`;
        try {
          logger.debug(`Creating TabMaster tab: ${tabName}`, { component: "TabMaster", tier, apps: buckets[tier].length });
          await this.steam.callPlugin("TabMaster", "createTab", {
            name: tabName,
            apps: buckets[tier],
          });
          logger.logTabMasterSync(tabName, buckets[tier].length);
        } catch (err) {
          logger.logTabMasterError(tabName, err as Error);
        }
      }
      
      logger.info("TabMaster sync completed", { component: "TabMaster", action: "sync", tiers: Object.keys(buckets).length });
    } catch (err) {
      logger.error("TabMaster sync failed", err, { component: "TabMaster" });
    }
  }

  // Watcher wiring - host should call when library changes
  watchLibraryChanges() {
    if (!this.steam || !this.steam.onLibraryChanged) {
      logger.warn("Steam integration not available, cannot watch library changes", undefined, { component: "Steam", action: "onLibraryChanged" });
      return;
    }
    logger.info("Registering library change watcher", { component: "Steam", action: "onLibraryChanged" });
    this.steam.onLibraryChanged(async () => {
      logger.info("Library changed detected", { component: "Steam", event: "onLibraryChanged" });
      if (this.settings.autoSync) {
        logger.info("Auto-sync enabled, regenerating collections", { component: "Collections", trigger: "libraryChanged" });
        await this.generateCollections();
      }
    });
  }
}
