// Mock Decky host to demonstrate serverApi wiring and steam integration.
const path = require('path');

async function main() {
  const backend = require(path.resolve(__dirname, '..', 'dist', 'backendEntry.js'));

  const collections = {};

  const steam = {
    async getOwnedAppIds() { return [1,2,3]; },
    async getInstalledAppIds() { return [1,3]; },
    async setCollection(name, apps) {
      console.log(`setCollection: ${name} -> [${apps.join(',')}]`);
      collections[name] = apps.slice();
    },
    isPluginInstalled(name) { return name === 'TabMaster'; },
    async callPlugin(pluginName, method, args) {
      console.log(`callPlugin ${pluginName}.${method}`, args);
    },
    onLibraryChanged(cb) {
      // expose trigger for demo
      this._onChange = cb;
    },
    triggerLibraryChange() {
      if (this._onChange) this._onChange();
    }
  };

  // serverApi mock - supports registerPluginMethod + callPluginMethod + getSteamApi
  const registry = {};
  const serverApi = {
    registerPluginMethod(name, fn) {
      registry[name] = fn;
      console.log('registered method', name);
    },
    callPluginMethod(name, args) {
      const fn = registry[name];
      if (!fn) throw new Error('Method not registered: '+name);
      // call fn and return promise result
      return Promise.resolve(fn(args));
    },
    getSteamApi() { return steam; }
  };

  console.log('Loading backend...');
  await backend.onLoad(serverApi);

  console.log('Initial settings:', await serverApi.callPluginMethod('getSettings'));

  // Update settings to enable autoSync and restrict to installed only
  await serverApi.callPluginMethod('updateSettings', { enabledBadges: ['platinum','gold','silver'], installedOnly: true, autoSync: true, concurrency: 2 });

  console.log('Generating collections (manual)...');
  await serverApi.callPluginMethod('generateCollections', { progressCallback: (c,t) => console.log(`progress ${c}/${t}`) });

  console.log('Collections after manual generation:', collections);

  console.log('Triggering library change to demonstrate auto-sync...');
  steam.triggerLibraryChange();

  // wait a bit for async auto-sync to run
  await new Promise(r => setTimeout(r, 1000));

  console.log('Collections after auto-sync:', collections);
}

main().catch(err => { console.error('mockHost error', err); process.exit(1); });
