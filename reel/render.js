// Films reel.html frame by frame.
//   node render.js stills <outDir> t1 t2 ...   → JPEG stills at those times
//   node render.js video  <outDir> [segIndex…] → one H.264 file per section (seg-N.mp4) + events.json
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { once } = require('events');
const fs = require('fs');
const path = require('path');

const [mode, outDir, ...rest] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, 'reel.html'));
  await page.evaluate(() => window.REEL.ready);
  const info = await page.evaluate(() => ({ duration: REEL.duration, fps: REEL.fps, cuts: REEL.cuts, events: REEL.events() }));
  fs.writeFileSync(path.join(outDir, 'events.json'), JSON.stringify(info));

  if (mode === 'stills') {
    for (const ts of rest) {
      const t = parseFloat(ts);
      await page.evaluate((t) => REEL.seek(t), t);
      await page.screenshot({ path: path.join(outDir, 'still-' + t.toFixed(2) + '.jpg'), type: 'jpeg', quality: 92 });
    }
  } else {
    const fps = info.fps, total = Math.round(info.duration * fps);
    const starts = info.cuts.map((c) => Math.round(c * fps)).concat([total]);
    const only = rest.length ? rest.map(Number) : starts.slice(0, -1).map((_, i) => i);
    for (const s of only) {
      const tmp = path.join(outDir, 'seg-' + s + '.part.mp4'), fin = path.join(outDir, 'seg-' + s + '.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps), tmp],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      const t0 = Date.now();
      for (let f = starts[s]; f < starts[s + 1]; f++) {
        await page.evaluate((t) => REEL.seek(t), f / fps);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
      }
      ff.stdin.end();
      const [code] = await once(ff, 'exit');
      if (code !== 0) throw new Error('ffmpeg failed on section ' + s);
      fs.renameSync(tmp, fin);
      console.log('section', s, (starts[s + 1] - starts[s]) + ' frames', ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  }
  if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
