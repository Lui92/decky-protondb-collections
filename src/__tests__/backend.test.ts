import Plugin from "../backend";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "proton_cache.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

jest.mock("node-fetch");
const { Response } = jest.requireActual("node-fetch");

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
  });

  test("fetchBadge caches results", async () => {
    (fetch as unknown as jest.Mock).mockResolvedValueOnce(new Response(JSON.stringify({ tier: "Gold" }), { status: 200 }));
    const tier1 = await (plugin as any).fetchBadge(12345);
    expect(tier1).toBe("gold");

    // Subsequent call should not call fetch again (mock would throw if called)
    (fetch as unknown as jest.Mock).mockImplementation(() => { throw new Error("should not be called"); });
    const tier2 = await (plugin as any).fetchBadge(12345);
    expect(tier2).toBe("gold");
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

    // Mock fetch responses: app 1 -> platinum, 2 -> silver, 3 -> unknown
    (fetch as unknown as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/1.json")) return Promise.resolve(new Response(JSON.stringify({ tier: "Platinum" }), { status: 200 }));
      if (url.includes("/2.json")) return Promise.resolve(new Response(JSON.stringify({ tier: "Silver" }), { status: 200 }));
      if (url.includes("/3.json")) return Promise.reject(new Error("network"));
      return Promise.resolve(new Response(JSON.stringify({ tier: "Unknown" }), { status: 200 }));
    });

    const buckets = await (plugin as any).generateCollections(undefined, 2);
    expect(buckets).toBeDefined();
    // Since installedOnly defaults to false, all apps should appear
    expect((buckets as any)["platinum"]).toContain(1);
    expect((buckets as any)["silver"]).toContain(2);
    expect((buckets as any)["unknown"]).toContain(3);
  });
});
