# Plugin Installation Checklist

Use this checklist before installing your plugin on Steam Deck:

## Pre-Build Checks
- [ ] `main.py` exists at project root
- [ ] `plugin.json` is valid and minimal (no custom fields)
- [ ] `package.json` has `"main": "dist/index.js"`
- [ ] `src/index.tsx` exists and uses `definePlugin` from `@decky/ui`
- [ ] `LICENSE` file exists at root

## Build & Output Checks
- [ ] Run `npm run build` completes without errors
- [ ] `dist/index.js` was created (frontend bundle)
- [ ] `dist/index.js.map` exists (source map)
- [ ] `dist/assets/` folder exists with icon.png
- [ ] `dist/backendEntry.js` exists (optional - for your Node backend)

## ZIP Creation Checklist
- [ ] Create ZIP with structure: `pluginname/` top-level directory
- [ ] Include `dist/` folder
- [ ] Include `package.json`
- [ ] Include `plugin.json`
- [ ] Include `main.py`
- [ ] Include `LICENSE` (or LICENSE.md)
- [ ] Include `README.md` (optional)
- [ ] Do NOT include `node_modules/`, `.git/`, or `src/`
- [ ] Verify ZIP structure: `protonsets-v0.1.0.zip → protonsets/→ dist/, package.json, plugin.json, main.py`

## Steam Deck Installation Steps
1. Transfer ZIP to Steam Deck USB/share
2. Open Decky Loader → Settings → Install from ZIP
3. Select your ZIP file
4. Wait for installation to complete
5. Plugin should appear in Decky menu
6. Check Decky Loader logs if it doesn't show up

## Troubleshooting on Steam Deck
- **Plugin doesn't appear**: Check Decky logs at `~/.local/share/decky-loader/logs/`
- **Plugin crashes on load**: Check main.py for syntax errors
- **Frontend doesn't load**: Check dist/index.js is built correctly
- **Missing dependencies**: Run `npm install` before building

## Repository Files Now Required
```
ProtonSets/
├── main.py ← NEW (required!)
├── plugin.json ← UPDATED
├── package.json ← UPDATED
├── decky.pyi ← NEW
├── rollup.config.js ← NEW
├── .vscode/ ← UPDATED
├── defaults/ ← NEW
├── py_modules/ ← NEW
├── LICENSE
├── README.md
├── src/
├── dist/
└── ... (other files)
```
