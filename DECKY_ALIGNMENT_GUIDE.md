# Decky Loader Plugin Alignment Guide

## What Was Fixed

Your plugin wasn't showing up on Steam Deck because it wasn't properly aligned with the Decky Loader plugin template. Here are the critical changes made:

### 1. **Added `main.py` (CRITICAL)**
- **Location**: Root directory
- **Why**: Decky Loader REQUIRES this file to recognize a plugin. Without it, the plugin fails silently during installation.
- **What it does**: Defines the Python backend with lifecycle hooks (`_main`, `_unload`, `_uninstall`, `_migration`)

### 2. **Fixed `plugin.json`**
- **Before**: Had non-standard fields like `backend: "dist/backendEntry.js"`, `main`, `source`, `private`, `assets`
- **After**: Clean, standard format matching Decky template:
  ```json
  {
    "name": "decky-protondb-collections",
    "title": "ProtonDB Collections", 
    "version": "0.1.0",
    "author": "",
    "description": "...",
    "license": "MIT",
    "flags": []
  }
  ```

### 3. **Added `decky.pyi`**
- Type hints for the `decky` Python module
- Enables IDE intellisense for Decky API calls

### 4. **Added `rollup.config.js`**
- Decky's standard build configuration
- You can keep using your esbuild script, but rollup is the official way

### 5. **Updated `package.json`**
- Changed `main` from `dist/backend.js` → `dist/index.js` (frontend entry)
- Removed non-standard `prepare-release` script

### 6. **Added Standard Directories**
- `.vscode/` - VS Code settings with Python path configuration
- `defaults/` - For plugin default configuration files
- `py_modules/` - For custom Python modules

## Distribution ZIP Structure

When packaging your plugin, the ZIP must follow this structure:

```
protonsets-vX.X.X.zip
└── protonsets/
    ├── dist/
    │   ├── index.js (required - your frontend)
    │   └── assets/
    │       └── icon.png
    ├── package.json (required)
    ├── plugin.json (required)
    ├── main.py (required - your backend)
    ├── LICENSE (required)
    └── README.md (optional but recommended)
```

**Key Point**: Do NOT include `backendEntry.js` in the distribution - use only `main.py` for the backend.

## Next Steps

1. **Rebuild your plugin**:
   ```bash
   npm run build
   ```

2. **Test locally on Steam Deck**:
   - Verify `dist/index.js` exists and is built correctly
   - Ensure `main.py` is at the root
   - Create a proper ZIP following the structure above

3. **Install on Steam Deck**:
   - Use Decky Loader → Settings → Install from URL or ZIP
   - Your plugin should now appear in the plugin list

## Why It Wasn't Working

1. **No `main.py`** - Decky scans for this file first; without it, the plugin installation fails silently
2. **Wrong plugin metadata** - Non-standard `plugin.json` fields confused Decky Loader
3. **Mixed backend approach** - Tried to use JS backend (`backendEntry.js`) instead of Python (`main.py`)
4. **Missing standard structure** - Custom setup meant Decky Loader couldn't find required files

## Notes on Your Custom Backend

Your original `backendEntry.ts` and JavaScript backend approach is technically possible but not standard. The template uses Python. If you want to:
- **Use your JS backend**: Remove `main.py` and configure `plugin.json` with `backend` field (NOT recommended)
- **Use Python backend** (recommended): Implement your backend logic in `main.py` instead

Current setup uses the Python backend approach (standard/recommended).
