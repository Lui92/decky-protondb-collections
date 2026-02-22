/**
 * Decky-specific glue helper. This file does not hard-depend on a specific Decky
 * runtime version — instead it attempts to register backend methods using the
 * common registration entrypoints. When integrating into Decky 1.1.3+ you can
 * call `registerWithDecky(serverApi)` from the plugin backend entry.
 */

import * as server from "./server";

// Try to register functions under common serverApi names. The Decky host will
// provide a `serverApi` object; its exact method names can vary between
// implementations, so we attempt multiple registration strategies.
export function registerWithDecky(serverApi: any) {
  if (!serverApi) throw new Error("serverApi is required to register backend methods");

  const methods: { [name: string]: Function } = {
    getSettings: server.getSettings,
    updateSettings: server.updateSettings,
    generateCollections: server.generateCollections,
    onLoad: server.onLoad,
  };

  // Common registration APIs
  if (typeof serverApi.registerPluginMethod === "function") {
    for (const k in methods) serverApi.registerPluginMethod(k, methods[k]);
    return;
  }

  if (typeof serverApi.registerMethod === "function") {
    for (const k in methods) serverApi.registerMethod(k, methods[k]);
    return;
  }

  // Some hosts expose an `expose` or `register` method
  if (typeof serverApi.expose === "function") {
    serverApi.expose(methods);
    return;
  }

  if (typeof serverApi.register === "function") {
    serverApi.register(methods);
    return;
  }

  // Last resort: attach to serverApi.methods
  (serverApi as any).pluginMethods = Object.assign((serverApi as any).pluginMethods || {}, methods);
}

export default registerWithDecky;
