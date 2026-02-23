import Plugin from "../backend";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "proton_cache.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

jest.mock("node-fetch");

describe("Cache eviction", () => {
  beforeEach(() => {
    try { if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE); } catch {};
    try { if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE); } catch {};
  });

  test("evicts oldest entries when maxCacheEntries is small", () => {
    const p = new Plugin();
    (p as any).maxCacheEntries = 2;
    // add three cache entries with different timestamps
    const now = Date.now();
    (p as any).cache = {
      "10": { tier: "gold", updated: now - 30000 },
      "11": { tier: "silver", updated: now - 20000 },
      "12": { tier: "platinum", updated: now - 10000 },
    };
    (p as any).evictCacheIfNeeded();
    const keys = Object.keys((p as any).cache);
    expect(keys.length).toBeLessThanOrEqual(2);
    // Oldest entry (updated 30 seconds ago) should be evicted
    expect(keys).not.toContain("10");
    // Newest entries should remain
    expect(keys).toContain("11");
    expect(keys).toContain("12");
  });
});
