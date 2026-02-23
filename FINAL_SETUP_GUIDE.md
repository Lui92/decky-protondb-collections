# 🎉 Complete Migration to Python Backend + pnpm

## ✅ What's Been Done

Your plugin has been **fully migrated** from custom Node.js backend to the **official Python backend** architecture.

### Modified Files
- ✅ `main.py` - Complete Python port with all backend logic
- ✅ `plugin.json` - Cleaned up (removed `backend` field)
- ✅ `package.json` - Added pnpm v9 + build scripts
- ✅ `.npmrc` - Enforces pnpm usage
- ✅ `.pnpmrc` - pnpm configuration
- ✅ `.vscode/tasks.json` - Build tasks for pnpm
- ✅ `.vscode/settings.json` - Python & TypeScript settings

### New Documentation
- 📖 `PYTHON_MIGRATION_GUIDE.md` - Architecture & porting details
- 📋 `SETUP_CHECKLIST.md` - Step-by-step setup
- 📖 `DECKY_ALIGNMENT_GUIDE.md` - Template alignment overview
- 📋 `INSTALLATION_CHECKLIST.md` - ZIP verification

### Untouched (Still Work)
- ✅ `src/index.tsx` - Frontend (calls backend via serverApi)
- ✅ `src/types.ts` - Shared types
- ✅ All other source files

## 🚀 Quick Start

### 1️⃣ Install pnpm (if not already installed)
```bash
npm install -g pnpm@9
```

### 2️⃣ Install dependencies
```bash
pnpm install
```

### 3️⃣ Build the plugin
```bash
pnpm run build
```

### 4️⃣ Create distribution ZIP
```bash
pnpm run package
```

### 5️⃣ Install on Steam Deck
Transfer ZIP to Steam Deck:
- Decky Loader → Settings → Install from ZIP
- Select your `decky-protondb-collections.zip`
- Plugin should now appear in Decky menu!

## 📋 Architecture Overview

### Backend Flow
```
Steam Deck (Decky Loader)
  ↓
  main.py (Plugin class)
    ├── fetch_badge() → ProtonDB API → cache
    ├── generate_collections() → Steam API
    ├── sync_tab_master() → Tab Master plugin
    └── settings persistence
  ↓
Frontend (React via serverApi)
```

### Key Python Components

| Component | Purpose |
|-----------|---------|
| `http_get_json()` | Rate-limited HTTP with retry logic |
| `fetch_badge()` | Get ProtonDB tier for game, use cache |
| `generate_collections()` | Fetch all games, group by tier, create collections |
| `sync_tab_master()` | Optional sync with Tab Master if installed |
| `load_cache()` / `save_cache()` | Persistent badge cache (30-day TTL) |
| `load_settings()` / `save_settings()` | Persist user preferences |

### Frontend Components
- Badge toggles (Platinum, Gold, Silver, Bronze, Borked)
- Installed-only filter
- Auto-sync toggle
- Manual refresh button
- Progress bar during generation

## 🔧 Configuration Files Explained

### `.npmrc`
```
engine-strict=true
```
Enforces pnpm v9 - prevents accidental npm usage that would break the build.

### `.pnpmrc`
```
shamefully-hoist=true
strict-peer-dependencies=false
```
Configures pnpm to work better with this project structure.

### `.vscode/tasks.json`
Five build tasks:
- **setup** - Initial `pnpm install`
- **build** - Build frontend (default, `Ctrl+Shift+B`)
- **watch** - Auto-rebuild on file changes
- **test** - Run tests
- **package** - Create ZIP for distribution

## 📦 Distribution Package Structure

When you run `pnpm run package`, the ZIP contains:
```
protonsets-v0.1.0.zip
└── protonsets/
    ├── dist/
    │   ├── index.js (frontend bundle)
    │   └── assets/
    │       └── icon.png
    ├── main.py (python backend)
    ├── plugin.json (metadata)
    ├── package.json (version info)
    ├── LICENSE
    └── README.md
```

**DO NOT** include: `node_modules/`, `src/`, `.git/`, build artifacts

## 🐍 Python Dependencies

Your `main.py` uses:
- **asyncio** (built-in) - Async operations
- **aiohttp** - Async HTTP (should be available on Steam Deck)
- **json** (built-in) - JSON parsing
- **os** (built-in) - File operations
- **time** (built-in) - Timing/caching
- **decky** - Provided by Decky Loader

**aiohttp** is critical - it's typically pre-installed with Decky but if missing:
```bash
# On Steam Deck
pip install aiohttp
```

## 📊 Ported Logic Summary

All your original TypeScript logic is now in Python:

| Feature | TypeScript Original | Python Now |
|---------|-------------------|-----------|
| Rate limiting | `httpGetJson()` | `http_get_json()` |
| Cache with TTL | `fetchBadge()` + `cache` | `fetch_badge()` + `evict_cache_if_needed()` |
| Collection generation | `generateCollections()` | `generate_collections()` |
| Tab Master sync | `syncTabMaster()` | `sync_tab_master()` |
| Library watching | `watchLibraryChanges()` | `watch_library_changes()` |
| Settings management | `updateSettings()` | `update_settings()` |

**No logic was lost, just translated to Python!**

## ⚡ Development Workflow

### Local Testing
```bash
# Initial setup
pnpm install

# During development (auto-rebuild)
pnpm run watch

# Build once for testing
pnpm run build

# Run tests
pnpm run test
```

### Before Pushing/Sharing
```bash
# Final build
pnpm run build

# Create ZIP
pnpm run package

# Verify ZIP contents
unzip -l decky-protondb-collections.zip
```

### On Steam Deck
1. Transfer ZIP via USB/network
2. Decky Loader → Install from ZIP
3. Check `~/.local/share/decky-loader/logs/` for errors
4. Plugin should appear in Decky menu

## 🔍 Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm@9
```

### Build errors - "Module not found"
```bash
pnpm install  # Reinstall dependencies
pnpm run build
```

### Plugin doesn't appear on Steam Deck
- Check: `main.py` is at project root
- Check: `plugin.json` has NO `backend` field
- Check: `dist/index.js` exists (> 50KB)
- Restart: Decky Loader
- Check: Logs at `~/.local/share/decky-loader/logs/`

### "aiohttp not found" on Steam Deck
```bash
# SSH into Steam Deck
pip install aiohttp
# Restart Decky Loader
```

### Frontend doesn't load
- Rebuild: `pnpm run build`
- Check: `dist/index.js` has content
- Verify: No console errors in Steam Deck browser

## 📚 Additional Resources

- [Decky Plugin Template](https://github.com/SteamDeckHomebrew/decky-plugin-template)
- [Decky Frontend Lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib)
- [ProtonDB API Docs](https://www.protondb.com)
- [Steam Deck Plugin Dev Wiki](https://wiki.deckbrew.xyz/en/user-guide/home#plugin-development)
- [pnpm Documentation](https://pnpm.io/)

## 📋 Next Steps

1. **Locally**: `pnpm install && pnpm run build`
2. **Verify**: Check `dist/index.js` exists
3. **Package**: `pnpm run package`
4. **Test**: Install on Steam Deck
5. **Debug**: Check logs if needed
6. **Share**: Distribute the ZIP!

---

**Why This Matters:**
- ✅ Aligns with official Decky template
- ✅ Properly recognized by Decky Loader
- ✅ Uses standard Python backend (no custom Node bridge)
- ✅ pnpm ensures reproducible builds
- ✅ Better compatibility with CI/CD and plugin store submission

**You're ready to deploy!** 🚀
