// align_paintings.js - register each painting to its reference by comparing non-black content boxes.
// usage: node tools/align_paintings.js art/refs art/painted web/painted_manifest.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [,, refDir, paintDir, manifestPath] = process.argv;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('about:blank');
  const bbox = async (file) => {
    const b64 = fs.readFileSync(file).toString('base64');
    const mime = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return page.evaluate(async ([src]) => {
      const img = new Image(); img.src = src; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
      const d = c.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const o = (y * cv.width + x) * 4;
        if (d[o] + d[o + 1] + d[o + 2] > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return { w: cv.width, h: cv.height, x0, y0, x1, y1 };
    }, [`data:${mime};base64,${b64}`]);
  };
  const align = {};
  for (const f of fs.readdirSync(paintDir)) {
    const base = f.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    const ref = path.join(refDir, base + '.png');
    if (!fs.existsSync(ref)) { console.log('no reference for', f); continue; }
    const r = await bbox(ref), p = await bbox(path.join(paintDir, f));
    let sx = (p.x1 - p.x0) / (r.x1 - r.x0), sy = (p.y1 - p.y0) / (r.y1 - r.y0);
    // map quadrants and full-frame images: if the content fills the reference, use whole-image scaling
    if (r.x1 - r.x0 > r.w * 0.97) sx = p.w / r.w;
    if (r.y1 - r.y0 > r.h * 0.97) sy = p.h / r.h;
    const X = p.x0 - r.x0 * sx, Y = p.y0 - r.y0 * sy, W = r.w * sx, H = r.h * sy;
    align[base] = { x: +(X / p.w).toFixed(4), y: +(Y / p.h).toFixed(4), w: +(W / p.w).toFixed(4), h: +(H / p.h).toFixed(4) };
    console.log(base.padEnd(42), `${p.w}x${p.h}`, 'frame', JSON.stringify(align[base]));
  }
  let m = fs.readFileSync(manifestPath, 'utf8').replace(/\nconst PAINTED_ALIGN = [\s\S]*$/, '\n');
  m += 'const PAINTED_ALIGN = ' + JSON.stringify(align) + ';\n';
  fs.writeFileSync(manifestPath, m);
  await browser.close();
})();
