# Setup Checklist - Python Backend + pnpm

## Local Development Machine

### Prerequisites (One-time)
- [ ] Install Node.js v16.14+: `node --version`
- [ ] Install pnpm v9: `npm install -g pnpm@9`
- [ ] Verify: `pnpm --version` (should be 9.x)
- [ ] Git clone or have project folder

### Project Setup (First Time)
- [ ] Open project in VS Code
- [ ] Terminal: `pnpm install`
- [ ] Verify `node_modules/` was created
- [ ] Verify `pnpm-lock.yaml` was generated

### Build & Development
- [ ] Run: `pnpm run build`
- [ ] Verify: `dist/index.js` exists and is > 50KB
- [ ] Verify: `dist/assets/icon.png` exists
- [ ] Check: No errors in console

### Optional: Watch Mode
- [ ] Run: `pnpm run watch`
- [ ] Edit a TypeScript file in `src/`
- [ ] Verify rebuild happens automatically
- [ ] Press Ctrl+C to stop

## Creating Plugin ZIP

### Build for Release
- [ ] Run: `pnpm run build` (production build)
- [ ] Run: `pnpm run package` (creates zip)
- [ ] Check: `decky-protondb-collections.zip` exists (or similar name)

### ZIP Contents Verification
Extract and verify:
- [ ] `protonsets/dist/index.js` ✓
- [ ] `protonsets/dist/assets/icon.png` ✓
- [ ] `protonsets/main.py` ✓
- [ ] `protonsets/plugin.json` ✓
- [ ] `protonsets/package.json` ✓
- [ ] `protonsets/LICENSE` ✓
- [ ] `protonsets/README.md` ✓

DO NOT include:
- [ ] ❌ `node_modules/`
- [ ] ❌ `src/` (TypeScript source)
- [ ] ❌ `.git/`
- [ ] ❌ `backendEntry.js` or other JS backend files

## Steam Deck Installation

### Transfer ZIP to Steam Deck
- [ ] USB or network transfer ZIP file
- [ ] Example: `~/.local/share/decky-loader/plugins/`

### Install via Decky Loader
- [ ] Open Decky Loader menu (QAM button + ...)
- [ ] Settings → Plugin Store
- [ ] OR Settings → Install from ZIP
- [ ] Select your ZIP file
- [ ] Wait for installation
- [ ] Decky Loader should restart

### Verify Installation
- [ ] Plugin appears in Decky menu
- [ ] Click plugin - should show UI with badges
- [ ] Check logs: `~/.local/share/decky-loader/logs/`
- [ ] No errors in plugin log

## Troubleshooting

### Issue: "pnpm not found"
```bash
npm install -g pnpm@9
pnpm --version
```

### Issue: "Module not found" errors during build
```bash
pnpm install
pnpm run build
```

### Issue: Plugin doesn't appear on Steam Deck
1. Check `main.py` exists at root
2. Verify `plugin.json` format is correct
3. Check Decky logs: `~/.local/share/decky-loader/logs/`
4. Restart Decky Loader

### Issue: "aiohttp not found" error
Plugin needs Python `aiohttp` package (usually pre-installed with Decky).
Try: `pip install aiohttp` on Steam Deck if needed.

## Commands Reference

```bash
# Install dependencies (required first time)
pnpm install

# Build frontend
pnpm run build

# Development: Auto-rebuild on save
pnpm run watch

# Run tests
pnpm run test

# Create distribution ZIP
pnpm run package

# Start mock API bridge (for local testing)
pnpm run start-bridge
```

## Files to Commit/Share

✅ Essential:
- `main.py`
- `src/`
- `plugin.json`
- `package.json`
- `LICENSE`
- `README.md`
- `.gitignore`
- `.npmrc`
- `.pnpmrc`
- `.vscode/settings.json`
- `.vscode/tasks.json`

❌ Do NOT commit:
- `node_modules/`
- `dist/`
- `*.zip`
- `.DS_Store`
- Build artifacts

## VS Code Integration

### Using Tasks
Press `Ctrl+Shift+B` to run default build task.

Available tasks:
- **build** (default) - Build frontend
- **watch** - Auto-rebuild on save
- **test** - Run tests
- **setup** - Install dependencies
- **package** - Create ZIP

Click: Terminal > Run Task... to see all options.

## Notes

- Always use `pnpm` NOT `npm` (enforced by `.npmrc`)
- Python backend is auto-loaded by Decky (no build needed)
- Frontend must be built and included in ZIP
- pnpm v9 is required (check lock file compatibility)
