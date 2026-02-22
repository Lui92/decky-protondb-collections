// Simple esbuild-based build script to produce dist/ for Decky plugin
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

const watch = process.argv.includes('--watch');

async function build() {
  // Backend (node)
  await esbuild.build({
    entryPoints: [path.resolve('src', 'backendEntry.ts')],
    bundle: true,
    platform: 'node',
    sourcemap: true,
    outfile: path.join(outdir, 'backendEntry.js'),
    external: ['electron', '@decky/ui', '@decky/plugin'],
  });

  // Frontend (renderer) bundle
  await esbuild.build({
    entryPoints: [path.resolve('src', 'index.tsx')],
    bundle: true,
    platform: 'browser',
    sourcemap: true,
    outfile: path.join(outdir, 'index.js'),
    external: ['@decky/ui', 'react', 'react-dom'],
  });

  // copy plugin.json and assets
  try {
    fs.copyFileSync('plugin.json', path.join(outdir, 'plugin.json'));
    const assetsSrc = path.resolve('assets');
    const assetsDst = path.join(outdir, 'assets');
    if (fs.existsSync(assetsDst)) {
      // noop
    } else if (fs.existsSync(assetsSrc)) {
      fs.mkdirSync(assetsDst, { recursive: true });
      const files = fs.readdirSync(assetsSrc);
      for (const f of files) fs.copyFileSync(path.join(assetsSrc, f), path.join(assetsDst, f));
    }
  } catch (err) {
    console.error('Asset copy failed', err);
  }
}

if (watch) {
  console.log('Watching with esbuild...');
  // Simple watch: rebuild on file change using chokidar
  const chokidar = require('chokidar');
  const watcher = chokidar.watch('src', { ignoreInitial: true });
  const doBuild = () => build().catch(err=>console.error(err));
  doBuild();
  watcher.on('all', (ev, p) => {
    console.log('change detected', ev, p);
    doBuild();
  });
} else {
  build().catch(err => { console.error(err); process.exit(1); });
}
