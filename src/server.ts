/**
 * Bridge that wires the Plugin implementation to the host runtime.
 * The host (Decky) should call `onLoad(hostApi)` to provide the Steam integration
 * object (with methods used by the Plugin). The frontend will call the exported
 * methods via the server API.
 */

import Plugin from "./backend";
import { Settings, Buckets } from "./types";
import { logger } from "./logger";

const plugin = new Plugin();

// Host should call this with an object that implements the Steam integration
// expected by the backend: getOwnedAppIds, getInstalledAppIds, setCollection,
// isPluginInstalled, callPlugin, onLibraryChanged.
export async function onLoad(hostApi: any) {
  if (!hostApi) {
    logger.warn("onLoad called without hostApi", undefined, { component: "Server", action: "onLoad" });
    return;
  }
  logger.info("Server onLoad called, registering Steam integration", { component: "Server", action: "onLoad" });
  plugin.steam = hostApi;
  plugin.watchLibraryChanges();
  logger.info("Server onLoad completed, Steam integration ready", { component: "Server", action: "onLoad" });
}

export async function getSettings(): Promise<Settings> {
  logger.debug("Getting settings", { component: "Server", action: "getSettings" });
  return (plugin as any).settings;
}

export async function updateSettings(newSettings: Settings): Promise<void> {
  logger.info("Updating settings via server", { component: "Server", action: "updateSettings", badges: newSettings.enabledBadges?.length || 0 });
  try {
    await plugin.updateSettings(newSettings);
    logger.info("Settings updated successfully", { component: "Server", action: "updateSettings" });
  } catch (err) {
    logger.error("Failed to update settings", err, { component: "Server", action: "updateSettings" });
    throw err;
  }
}

// Frontend can provide an optional progressCallback; if the host doesn't support
// passing functions across RPC boundaries, server implementations often emit
// progress events instead. This signature accepts either a function or nothing.
export async function generateCollections(opts?: { progressCallback?: (c:number,t:number)=>void, concurrency?: number}): Promise<Buckets | null> {
  logger.info("generateCollections called from frontend", { component: "Server", action: "generateCollections", concurrency: opts?.concurrency || 6 });
  try {
    const result = await plugin.generateCollections(opts?.progressCallback, opts?.concurrency);
    if (result) {
      logger.info("Collections generated successfully", { component: "Server", action: "generateCollections", tiers: Object.keys(result).length });
    } else {
      logger.warn("Collections generation returned null", undefined, { component: "Server", action: "generateCollections" });
    }
    return result;
  } catch (err) {
    logger.error("Failed to generate collections", err, { component: "Server", action: "generateCollections" });
    throw err;
  }
}

// Export plugin instance for advanced host integration
export default plugin;
