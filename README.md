# decky-protondb-collections

Creates Steam collections based on ProtonDB compatibility tiers and optionally syncs them to Tab Master.

Quick start

1. Install dependencies:

```bash
npm install
```

2. Build:

```bash
npm run build
```

3. Package for release:

```bash
./release.sh
```

Notes and implementation details

- Backend: `src/backend.ts` implements caching, rate-limited ProtonDB fetch with retry/backoff, collection generation, and Tab Master sync.
- Frontend: `src/index.tsx` implements the UI using Decky components and calls backend methods via `serverApi.callPluginMethod`.
- Types: `src/types.ts` contains shared interfaces.

You will need to wire the `Plugin` instance from `src/backend.ts` into Decky's plugin lifecycle and inject the `steam` integration object that provides methods used in the backend (getOwnedAppIds, getInstalledAppIds, setCollection, isPluginInstalled, callPlugin, onLibraryChanged).

Decky version and template

- This project targets Decky API 1.1.3 compatibility. Please verify your Decky runtime and `@decky/ui` package version before installing. You can inspect the Decky plugin template at https://github.com/SteamDeckHomebrew/decky-plugin-template to match expected build layout and metadata.
- To verify `@decky/ui` locally run:

```powershell
npm view @decky/ui version
```

CI

This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` which runs `npm ci`, `npm run build`, and `npm test` on pushes and PRs to `main`.

Demo frontend

You can preview a small React demo that simulates the Decky `serverApi` and shows how the frontend calls backend methods. Open `demo/index.html` in a browser (it uses CDN React and Babel for quick demo purposes).

Expected hostApi / serverApi implementations

1) Host `serverApi` (Decky runtime)

The host should expose methods that allow the frontend to call backend functions. Example registration (server-side host):

```js
// Example host registration (Node)
const serverApi = {
	registerPluginMethod(name, fn) {
		// store function to be invoked from frontend
	},
	callPluginMethod(name, args) {
		// called by frontend; invoke registered function
	},
	getSteamApi() {
		// returns steam integration object used by backend.onLoad
	}
};
```

2) Host `steam` integration object (expected by backend)

The backend expects an injected `steam` object implementing:

- `getOwnedAppIds(): Promise<number[]>` — return all owned AppIDs
- `getInstalledAppIds(): Promise<number[]>` — return installed AppIDs
- `setCollection(name: string, apps: number[]): Promise<void>` — persist a Steam collection
- `isPluginInstalled(name: string): boolean` — check for Tab Master
- `callPlugin(pluginName: string, method: string, args: any): Promise<any>` — call other plugins (Tab Master)
- `onLibraryChanged(cb: ()=>void): void` — register library change handler

Example minimal `steam` implementation used in `scripts/mockHost.js`:

```js
const steam = {
	async getOwnedAppIds(){ return [1,2,3]; },
	async getInstalledAppIds(){ return [1,3]; },
	async setCollection(name, apps){ console.log('setCollection', name, apps); },
	isPluginInstalled(name){ return name === 'TabMaster'; },
	async callPlugin(pluginName, method, args){ console.log('callPlugin', pluginName, method, args); },
	onLibraryChanged(cb){ this._cb = cb; },
	triggerLibraryChange(){ if (this._cb) this._cb(); }
}
```

3) Backend registration helper

Our `src/deckyGlue.ts` exposes `registerWithDecky(serverApi)` which attempts to register backend functions under common names (`getSettings`, `updateSettings`, `generateCollections`, `onLoad`). The host must call `onLoad` and pass a `steam` integration object to complete wiring.

Demo

- Build: `npm run build`
- Run demo host: the repo includes `scripts/mockHost.js` which demonstrates `serverApi` registration and `steam` integration; run `node scripts/mockHost.js`.
- Preview demo UI: open `demo/index.html` in a browser.


Badges

- CI: ![CI](https://github.com/Lui92/decky-protondb-collections/actions/workflows/ci.yml/badge.svg)
- Release: ![Release](https://github.com/Lui92/decky-protondb-collections/actions/workflows/release.yml/badge.svg)