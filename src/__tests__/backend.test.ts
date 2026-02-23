import Plugin from "../backend";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "proton_cache.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

jest.mock("node-fetch");

describe("Plugin backend", () => {
  let plugin: Plugin;

  beforeEach(() => {
    // ensure cached files do not interfere with tests
    try { if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE); } catch {};
    try { if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE); } catch {};
    plugin = new Plugin();
    // small request limits for tests to run fast
    (plugin as any).maxConcurrentRequests = 2;
    (plugin as any).minIntervalMs = 0;
    
    // Clear and configure mock responses
    const mockFetch = fetch as any as jest.Mock;
    mockFetch.mockClear();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/1.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ tier: "Platinum" })
        });
      }
      if (url.includes("/2.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ tier: "Silver" })
        });
      }
      if (url.includes("/3.json")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ tier: "Unknown" })
        });
      }
      // Default mock for test case 1 (fetchBadge with app 12345)
      if (url.includes("/12345.json")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ tier: "Gold" })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ tier: "Unknown" })
      });
    });
  });

  test("fetchBadge caches results", async () => {
    const tier1 = await (plugin as any).fetchBadge(12345);
    expect(tier1).toBe("gold");

    // Subsequent call should use cache (no additional fetch calls)
    const mockFetch = fetch as any as jest.Mock;
    const callCountAfterFirst = mockFetch.mock.calls.length;
    const tier2 = await (plugin as any).fetchBadge(12345);
    expect(tier2).toBe("gold");
    // Verify no additional fetch was made (cache was used)
    expect(mockFetch.mock.calls.length).toBe(callCountAfterFirst);
  });

  test("generateCollections groups by tier and respects installedOnly", async () => {
    // Mock owned apps
    const owned = [1, 2, 3];
    (plugin as any).steam = {
      getOwnedAppIds: async () => owned,
      getInstalledAppIds: async () => [1, 3],
      setCollection: async (name: string, apps: number[]) => { /* no-op */ },
      isPluginInstalled: () => false,
    };

    const buckets = await (plugin as any).generateCollections(undefined, 2);
    expect(buckets).toBeDefined();
    // Since installedOnly defaults to false, apps should be grouped by tier
    // App 1 should be in platinum bucket
    expect((buckets as any)["platinum"]).toContain(1);
    // App 2 should be in silver bucket
    expect((buckets as any)["silver"]).toContain(2);
    // App 3 with 404 response should map to unknown
    expect((buckets as any)["unknown"]).toContain(3);
  });
});
