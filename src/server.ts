/**
 * Bridge that wires the Plugin implementation to the host runtime.
 * The host (Decky) should call `onLoad(hostApi)` to provide the Steam integration
 * object (with methods used by the Plugin). The frontend will call the exported
 * methods via the server API.
 */

import Plugin from "./backend";
import { Settings, Buckets } from "./types";

const plugin = new Plugin();

// Host should call this with an object that implements the Steam integration
// expected by the backend: getOwnedAppIds, getInstalledAppIds, setCollection,
// isPluginInstalled, callPlugin, onLibraryChanged.
export async function onLoad(hostApi: any) {
  if (!hostApi) return;
  plugin.steam = hostApi;
  plugin.watchLibraryChanges();
}

export async function getSettings(): Promise<Settings> {
  return (plugin as any).settings;
}

export async function updateSettings(newSettings: Settings): Promise<void> {
  await plugin.updateSettings(newSettings);
}

// Frontend can provide an optional progressCallback; if the host doesn't support
// passing functions across RPC boundaries, server implementations often emit
// progress events instead. This signature accepts either a function or nothing.
export async function generateCollections(opts?: { progressCallback?: (c:number,t:number)=>void, concurrency?: number}): Promise<Buckets | null> {
  return await plugin.generateCollections(opts?.progressCallback, opts?.concurrency);
}

// Export plugin instance for advanced host integration
export default plugin;
