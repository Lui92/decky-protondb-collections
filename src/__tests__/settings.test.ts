import Plugin from "../backend";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

describe("Settings persistence", () => {
  beforeEach(() => {
    try { if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE); } catch {};
  });

  test("updateSettings saves and loads settings", async () => {
    const p = new Plugin();
    const settings = { enabledBadges: ["gold"], installedOnly: true, autoSync: true, concurrency: 3, minIntervalMs: 50, maxCacheEntries: 10 } as any;
    await p.updateSettings(settings);
    // create new instance to read from disk
    const p2 = new Plugin();
    expect((p2 as any).settings.installedOnly).toBe(true);
    expect((p2 as any).settings.enabledBadges).toContain("gold");
    expect((p2 as any).settings.concurrency).toBe(3);
  });
});
