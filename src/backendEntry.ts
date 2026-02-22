import registerWithDecky from "./deckyGlue";

// Decky will call exported `onLoad` when starting the backend. We forward the
// provided serverApi to our registration helper which exposes backend methods
// (getSettings, updateSettings, generateCollections, onLoad).
export async function onLoad(serverApi: any) {
  try {
    registerWithDecky(serverApi);
    // Call plugin's onLoad if present
    if (serverApi && typeof serverApi.getSteamApi === "function") {
      const steam = serverApi.getSteamApi();
      // Try to call plugin.onLoad with steam integration if available
      try {
        const mod = require("./server");
        if (mod && typeof mod.onLoad === "function") await mod.onLoad(steam);
      } catch (err) {
        // ignore
      }
    }
  } catch (err) {
    console.error("Backend registration failed:", err);
  }
}

export async function onUnload() {
  // no-op for now
}
