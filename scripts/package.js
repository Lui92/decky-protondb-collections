const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function packagePlugin() {
  const dist = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(dist)) {
    console.error('dist/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const out = fs.createWriteStream(path.resolve(process.cwd(), 'decky-protondb-collections.zip'));
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(out);
  archive.directory(dist + '/', false);

  await archive.finalize();
  console.log('Created decky-protondb-collections.zip');
}

packagePlugin().catch(err => { console.error(err); process.exit(1); });
