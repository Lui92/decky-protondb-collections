const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

async function start() {
  const app = express();
  app.use(bodyParser.json({ limit: '2mb' }));

  // Load the bundled backend entry which registers its methods when onLoad is called
  const backend = require(path.resolve(__dirname, '..', 'dist', 'backendEntry.js'));

  // Registry to hold methods registered by backend
  const registry = {};

  // Minimal steam integration used by backend for demo/testing
  const collections = {};
  const steam = {
    async getOwnedAppIds() { return [1,2,3]; },
    async getInstalledAppIds() { return [1,3]; },
    async setCollection(name, apps) { collections[name] = apps.slice(); console.log('setCollection', name, apps); },
    isPluginInstalled(name) { return name === 'TabMaster'; },
    async callPlugin(pluginName, method, args) { console.log('callPlugin', pluginName, method, args); },
    onLibraryChanged(cb) { this._cb = cb; },
    triggerLibraryChange() { if (this._cb) this._cb(); }
  };

  // serverApi object passed to backend to register methods
  const serverApi = {
    registerPluginMethod(name, fn) { registry[name] = fn; console.log('registered', name); },
    registerMethod(name, fn) { registry[name] = fn; console.log('registered', name); },
    expose(obj) { Object.assign(registry, obj); Object.keys(obj).forEach(k=>console.log('exposed',k)); },
    getSteamApi() { return steam; }
  };

  // Call backend onLoad to register methods
  if (typeof backend.onLoad === 'function') {
    await backend.onLoad(serverApi);
  }

  // Serve demo and static files
  app.use(express.static(path.resolve(__dirname, '..', 'demo')));
  app.use('/demo', express.static(path.resolve(__dirname, '..', 'demo')));
  app.use('/dist', express.static(path.resolve(__dirname, '..', 'dist')));

  // RPC endpoint for demo frontend: { method: string, args: any }
  app.post('/rpc', async (req, res) => {
    try {
      const { method, args } = req.body || {};
      if (!method || !registry[method]) return res.status(404).json({ error: 'method not found' });
      const result = await registry[method](args);
      res.json({ result });
    } catch (err) {
      console.error('rpc error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/collections', (req, res) => res.json(collections));

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Express bridge listening on http://localhost:${port}`));
}

start().catch(err=>{ console.error(err); process.exit(1); });
