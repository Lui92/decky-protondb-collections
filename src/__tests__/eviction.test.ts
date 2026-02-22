import Plugin from "../backend";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "proton_cache.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

describe("Cache eviction", () => {
  beforeEach(() => {
    try { if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE); } catch {};
    try { if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE); } catch {};
  });

  test("evicts oldest entries when maxCacheEntries is small", async () => {
    const p = new Plugin();
    (p as any).maxCacheEntries = 2;
    // add three cache entries
    (p as any).cache = {
      "10": { tier: "gold", updated: Date.now() - 30000 },
      "11": { tier: "silver", updated: Date.now() - 20000 },
      "12": { tier: "platinum", updated: Date.now() - 10000 },
    };
    (p as any).evictCacheIfNeeded();
    const keys = Object.keys((p as any).cache);
    expect(keys.length).toBeLessThanOrEqual(2);
    expect(keys).not.toContain("10");
  });
});
