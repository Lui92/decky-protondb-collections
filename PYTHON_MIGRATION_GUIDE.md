# Python Backend Migration - Complete Setup Guide

## What Changed

Your plugin has been successfully migrated from **Node.js backend** to **Python backend** (official Decky standard).

### Backend Architecture
**Before**: Node.js-based (`src/backend.ts`, `src/server.ts`, `src/backendEntry.ts`)
**After**: Pure Python (`main.py`)

### Key Files Modified
- ✅ `main.py` - Full Python port with all logic
- ✅ `plugin.json` - Removed `backend` field (now uses Python by default)
- ✅ `package.json` - Added pnpm v9 support
- ✅ `.npmrc` - Force pnpm usage
- ✅ `.pnpmrc` - pnpm configuration
- ✅ `.vscode/tasks.json` - Updated build tasks for pnpm
- ✅ `.vscode/settings.json` - Added Python path configuration

## Setup Instructions

### Prerequisites
On your **development machine**:
```bash
# Install Node.js v16.14+
node --version  # should be 16.14 or higher

# Install pnpm v9 (REQUIRED - not npm)
npm install -g pnpm@9
pnpm --version  # should be 9.x
```

On **Steam Deck**:
- Decky Loader v2.5+
- Python 3 with aiohttp support (typically pre-installed)

### Development Setup

1. **Install dependencies**:
```bash
pnpm install
```
This uses pnpm (not npm!) and sets up all frontend dependencies.

2. **Build the frontend**:
```bash
pnpm run build
```
Creates `dist/index.js` (frontend bundle).

3. **Watch mode during development**:
```bash
pnpm run watch
```

4. **Run tests**:
```bash
pnpm run test
```

### Building for Release

```bash
pnpm run build
pnpm run package
```

This creates the final plugin zip ready for distribution.

## Architecture Overview

### Python Backend (`main.py`)
The `Plugin` class handles:
- **Caching**: ProtonDB badge data with 30-day TTL, auto-eviction
- **Rate Limiting**: Concurrent requests (configurable), minimum interval between requests
- **Collection Generation**: Groups games by ProtonDB tier (Platinum/Gold/Silver/Bronze/Borked)
- **Steam Integration**: Creates Steam collections, syncs with Tab Master
- **Settings Persistence**: Saves user preferences to disk
- **Async Operations**: Full async/await for non-blocking I/O

### Frontend (`src/index.tsx`)
React component using Decky UI that:
- Displays badge toggles
- Shows installed-only filter
- Auto-sync toggle
- Progress bar during collection generation
- Settings persistence

### Communication
Decky Loader automatically routes:
- `serverApi.callPluginMethod("getSettings")` → `Plugin.get_settings()`
- `serverApi.callPluginMethod("updateSettings", data)` → `Plugin.update_settings(data)`
- `serverApi.callPluginMethod("generateCollections", opts)` → `Plugin.generate_collections(opts)`

## Porting Details

All logic from TypeScript has been ported to Python:

| Functionality | Location |
|--------------|----------|
| Cache management (load/save/evict) | `load_cache()`, `save_cache()`, `evict_cache_if_needed()` |
| Rate-limited HTTP fetching | `http_get_json()` |
| Badge fetching with retry | `fetch_badge()` |
| Collection generation | `generate_collections()` |
| Tab Master sync | `sync_tab_master()` |
| Library change watching | `watch_library_changes()` |
| Settings management | `load_settings()`, `save_settings()`, `update_settings()` |

## Dependencies

### Frontend (Node/TypeScript)
- `@decky/ui` - Decky UI components
- `@decky/api` - Plugin lifecycle & communication
- `react`, `react-dom` - UI framework

### Backend (Python)
- `asyncio` - Async operations (built-in)
- `aiohttp` - Async HTTP client (requires: `pip install aiohttp`)
- `json` - JSON parsing (built-in)

**Note**: aiohttp must be available in your Steam Deck Python environment. It's typically pre-installed with Decky Loader.

## Configuration Files

### `.npmrc` & `.pnpmrc`
Enforce pnpm and configure symlink behavior. DO NOT switch to npm or yarn.

### `.vscode/tasks.json`
VS Code tasks for:
- `setup` - Install dependencies
- `build` - Build frontend (Default build task)
- `watch` - Watch mode
- `test` - Run tests
- `package` - Create plugin zip

### `.vscode/settings.json`
Python intellisense for Decky API (requires decky-loader source).

## File Structure for Distribution

When packaging for Steam Deck, the ZIP must contain:

```
protonsets-v0.1.0.zip
└── protonsets/
    ├── dist/                    # Frontend bundle (required)
    │   ├── index.js
    │   └── assets/
    │       └── icon.png
    ├── main.py                  # Python backend (required)
    ├── plugin.json              # Metadata (required)
    ├── package.json             # Version info (required)
    ├── LICENSE                  # License (required)
    └── README.md                # Documentation (recommended)
```

**Important**: Do NOT include `node_modules/`, `src/`, `.git/`, or TypeScript files in the distribution.

## Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm@9
```

### "aiohttp not found" on Steam Deck
Plugin may fail to load if aiohttp isn't available. Usually present by default with Decky.

### "Frontend not loading"
- Check `dist/index.js` was created: `ls -la dist/`
- Rebuild: `pnpm run build`

### "Backend methods not found"
- Verify `main.py` is at repository root
- Check `plugin.json` has NO `backend` field
- Restart Decky Loader

## Next Steps

1. **Verify setup locally**:
   ```bash
   pnpm install
   pnpm run build
   ```

2. **Create distribution ZIP**:
   ```bash
   pnpm run package
   ```

3. **Install on Steam Deck**:
   - Transfer ZIP to Steam Deck
   - Decky Loader → Settings → Install from ZIP
   - Select your ZIP file

4. **Check logs on Steam Deck**:
   ```bash
   cd ~/.local/share/decky-loader/logs/
   tail -f plugin_*.log
   ```

## References

- [Decky Plugin Template](https://github.com/SteamDeckHomebrew/decky-plugin-template)
- [Decky Frontend Lib](https://github.com/SteamDeckHomebrew/decky-frontend-lib)
- [ProtonDB API](https://www.protondb.com)
- [Steam Deck Wiki - Plugin Development](https://wiki.deckbrew.xyz/en/user-guide/home#plugin-development)
