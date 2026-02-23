const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function packagePlugin() {
  const dist = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const pkg = require(path.resolve(__dirname, '..', 'package.json'));
  const pluginName = pkg.name || 'plugin';

  const outName = `${pluginName}.zip`;
  const out = fs.createWriteStream(path.resolve(process.cwd(), outName));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(out);

  // Ensure we don't package a duplicate plugin.json from dist/
  const distPluginJson = path.join(dist, 'plugin.json');
  if (fs.existsSync(distPluginJson)) {
    try {
      fs.unlinkSync(distPluginJson);
      console.log('Removed duplicate plugin.json from dist/');
    } catch (err) {
      console.warn('Could not remove dist/plugin.json:', err);
    }
  }

  // Put everything under a top-level folder named after the package
  // - include the dist/ folder (bundle files)
  // - include plugin.json and package.json at the top of that folder
  archive.directory(dist + '/', `${pluginName}/dist`);
  const pluginJsonPath = path.resolve(__dirname, '..', 'plugin.json');
  if (fs.existsSync(pluginJsonPath)) {
    archive.file(pluginJsonPath, { name: `${pluginName}/plugin.json` });
  }
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    archive.file(packageJsonPath, { name: `${pluginName}/package.json` });
  }

  await archive.finalize();
  console.log('Created', outName);
}

packagePlugin().catch(err => { console.error(err); process.exit(1); });
