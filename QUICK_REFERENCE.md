# Quick Reference - Commands & Troubleshooting

## Most Important Commands

```bash
# First time setup
pnpm install

# Build for testing
pnpm run build

# Development (auto-rebuild)
pnpm run watch

# Create release ZIP
pnpm run package

# Run tests
pnpm run test
```

## File Checklist

Before installing on Steam Deck, verify these exist:

```
ProtonSets/
├── main.py ← CRITICAL (Python backend)
├── plugin.json ← CRITICAL (metadata)
├── package.json ← REQUIRED
├── dist/
│   ├── index.js ← CRITICAL (frontend bundle)
│   └── assets/icon.png
├── LICENSE ← REQUIRED
├── README.md
├── .npmrc ← pnpm configuration
├── .pnpmrc ← pnpm configuration
└── .vscode/
    ├── settings.json
    └── tasks.json
```

## Common Issues & Fixes

### ❌ "pnpm: command not found"
```bash
npm install -g pnpm@9
```

### ❌ "TypeError: Cannot find module '@decky/ui'"
```bash
pnpm install
pnpm run build
```

### ❌ "Plugin doesn't appear on Steam Deck"
1. Verify: `main.py` at repository root
2. Check: `plugin.json` is valid JSON (no `backend` field)
3. Verify: `dist/index.js` exists and > 50KB
4. Restart: Decky Loader
5. Check: Logs at `~/.local/share/decky-loader/logs/`

### ❌ "ImportError: No module named 'aiohttp'"
On Steam Deck terminal:
```bash
pip install aiohttp
```

### ❌ "TypeError: 'coroutine' object is not subscriptable"
Frontend-backend communication issue. Usually fixed by:
1. `pnpm run build`
2. Restart Decky Loader

### ❌ "Cannot read properties of undefined (reading 'callPluginMethod')"
serverApi not injected. Verify frontend is loaded properly:
1. Check console errors
2. Verify `dist/index.js` was built
3. Restart Steam

## What Each File Does

| File | Purpose | Modified? |
|------|---------|-----------|
| `main.py` | Python backend logic | ✅ YES - Full port |
| `src/index.tsx` | React frontend UI | ⚫ NO - Still works |
| `plugin.json` | Plugin metadata | ✅ YES - Cleaned up |
| `package.json` | Dependencies & scripts | ✅ YES - Added pnpm |
| `.npmrc` / `.pnpmrc` | Package manager config | ✅ NEW |
| `.vscode/tasks.json` | Build tasks | ✅ NEW |
| `dist/` | Built frontend (output) | 🔄 Auto-generated |

## Build Process

```
User runs: pnpm run build
         ↓
scripts/build.js (esbuild)
         ↓
src/index.tsx + deps compiled
         ↓
dist/index.js (frontend bundle)
         ↓
Included in ZIP for distribution
```

**Frontend only** - Python backend (`main.py`) is auto-loaded by Decky.

## Installation on Steam Deck

### Via ZIP File
1. Copy ZIP to Steam Deck (USB/network)
2. Open Decky Loader
3. Settings → Install from ZIP
4. Select ZIP file
5. Wait for installation
6. Restart Decky if needed
7. Plugin appears in Decky menu

### Verify Installation
```bash
# SSH into Steam Deck
ls ~/.local/share/decky-loader/plugins/

# Should see: decky-protondb-collections/

# Check logs
tail -f ~/.local/share/decky-loader/logs/plugin_*.log
```

## pnpm vs npm - Why It Matters

| Feature | npm | pnpm |
|---------|-----|------|
| Speed | Slower | ⚡ Much faster |
| Disk space | Huge `node_modules/` | Efficient symlinks |
| Lock file | `package-lock.json` | `pnpm-lock.yaml` |
| Reproducible | Sometimes | Always |
| Decky requirement | ❌ NO | ✅ YES (v9) |

**pnpm is mandatory** for proper Decky plugin compatibility.

## Testing Locally

### Mock Host (Optional)
```bash
pnpm run start-bridge &
# Opens mock frontend at http://localhost:5000
```

### Real Hardware Testing
1. Build: `pnpm run build`
2. Package: `pnpm run package`
3. Transfer ZIP to Steam Deck
4. Install via Decky Loader
5. Test in game mode

## Git & Version Control

**DO NOT commit:**
```
node_modules/
dist/
*.zip
pnpm-lock.yaml (optional - include for reproducibility)
```

**DO commit:**
```
main.py
src/
plugin.json
package.json
.npmrc
.pnpmrc
.vscode/
LICENSE
README.md
```

## Performance Notes

- **Cache TTL**: 30 days (badge data)
- **Concurrency**: 6 parallel ProtonDB requests (configurable)
- **Rate limit**: 200ms between requests minimum (configurable)
- **Cache size**: 2000 entries max (configurable)
- **API timeouts**: 10 seconds per request

User-adjustable via frontend settings.

## References

- **Decky Template**: https://github.com/SteamDeckHomebrew/decky-plugin-template
- **pnpm Docs**: https://pnpm.io/
- **Python aiohttp**: https://docs.aiohttp.org/
- **ProtonDB API**: https://www.protondb.com

---

**Still stuck?** Check the detailed guides:
- `FINAL_SETUP_GUIDE.md` - Complete overview
- `PYTHON_MIGRATION_GUIDE.md` - Architecture details
- `SETUP_CHECKLIST.md` - Step-by-step walkthrough
