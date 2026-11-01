// build.js - inline all scripts into a single HTML file.
// usage: node tools/build.js web/index.html dist/TheGreatEscapeHD.html
const fs = require('fs');
const path = require('path');
const [,, src, dst, paintedDir] = process.argv;
const dir = path.dirname(src);
let html = fs.readFileSync(src, 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8').replace(/<\/script/g, '<\\/script');
  return `<script>\n// ---- ${f} ----\n${code}\n</script>`;
});
if (paintedDir && fs.existsSync(paintedDir)) {
  const data = {};
  for (const f of fs.readdirSync(paintedDir)) {
    const ext = path.extname(f).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : null;
    if (!mime) continue;
    data[f] = `data:${mime};base64,` + fs.readFileSync(path.join(paintedDir, f)).toString('base64');
  }
  html = html.replace('<script>\n// ---- painted_manifest.js ----', `<script>const PAINTED_DATA = ${JSON.stringify(data)};</script>\n<script>\n// ---- painted_manifest.js ----`);
  console.log('inlined', Object.keys(data).length, 'painted images');
}
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, html);
console.log('wrote', dst, (fs.statSync(dst).size / 1024).toFixed(0) + 'KB');
