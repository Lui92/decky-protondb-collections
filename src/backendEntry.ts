import registerWithDecky from "./deckyGlue";
import { logger } from "./logger";

// Decky will call exported \onLoad\ when starting the backend. We forward the
// provided serverApi to our registration helper which exposes backend methods
// (getSettings, updateSettings, generateCollections, onLoad).
export async function onLoad(serverApi: any) {
  logger.info("Backend onLoad called", { component: "BackendEntry", action: "onLoad" });
  try {
    registerWithDecky(serverApi);
    logger.info("Decky registration completed", { component: "BackendEntry", action: "registerWithDecky" });
    
    // Call plugin's onLoad if present
    if (serverApi && typeof serverApi.getSteamApi === "function") {
      logger.debug("Retrieving Steam API from Decky", { component: "BackendEntry", action: "getSteamApi" });
      const steam = serverApi.getSteamApi();
      // Try to call plugin's onLoad with steam integration if available
      try {
        const mod = require("./server");
        if (mod && typeof mod.onLoad === "function") {
          logger.debug("Calling server.onLoad with Steam integration", { component: "BackendEntry", action: "serverOnLoad" });
          await mod.onLoad(steam);
          logger.info("Server onLoad completed successfully", { component: "BackendEntry", action: "serverOnLoad" });
        }
      } catch (err) {
        logger.warn("Failed to call server.onLoad", err, { component: "BackendEntry", action: "serverOnLoad" });
      }
    } else {
      logger.debug("getSteamApi not available or serverApi not provided", { component: "BackendEntry", action: "getSteamApi" });
    }
    logger.info("Backend onLoad fully completed", { component: "BackendEntry", action: "onLoad" });
  } catch (err) {
    logger.error("Backend registration failed", err, { component: "BackendEntry", action: "onLoad" });
  }
}

export async function onUnload() {
  logger.info("Backend onUnload called", { component: "BackendEntry", action: "onUnload" });
}
