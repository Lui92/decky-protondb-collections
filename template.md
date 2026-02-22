# Decky Plugin Template Alignment

This repository was scaffolded to align with the *decky-plugin-template* style. Key points:

- `scripts/build.js` uses `esbuild` to bundle `src/backendEntry.ts` -> `dist/backendEntry.js` and `src/index.tsx` -> `dist/index.js`.
- `plugin.json` is copied into `dist` by the build script, and `assets` are copied into `dist/assets`.
- Use `npm run build` to produce the `dist/` folder suitable for packaging.

If you want exact 1:1 file contents with the upstream template, point me to the preferred template commit or provide its files and I'll sync them verbatim.
