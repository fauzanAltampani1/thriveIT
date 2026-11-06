// Builds output/thrivit-reel.mp4 end to end: frames → one H.264 file per section → sound → joined and muxed, plus a cover.
// The soundtrack is synthesised by music.py. If voiceover.mp3 is here, it is split into lines and laid over the
// effects and music, which duck under it (see voice.py). The result is normalised to -14 LUFS for Instagram.
// Needs ffmpeg on PATH, Python 3 with numpy and scipy, and `npx playwright install chromium` once.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs';

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('failed: ' + cmd + ' ' + args.join(' '));
    process.exit(r.status ?? 1);
  }
}

mkdirSync('out', { recursive: true });
mkdirSync('output', { recursive: true });
run('node', ['render.js', 'video', 'out']);
run(python, ['sfx.py', 'out/events.json', 'out/sfx.wav']);
run(python, ['music.py', 'out/events.json', 'out/music.wav']);
if (existsSync('voiceover.mp3')) run(python, ['voice.py', 'voiceover.mp3', 'out/sfx.wav', 'out/mix.wav', 'out/music.wav']);
else run('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'out/sfx.wav', '-i', 'out/music.wav', '-filter_complex', '[1:a]volume=0.55[m];[0:a][m]amix=inputs=2:normalize=0', 'out/mix.wav']);
const audio = 'out/mix.wav';
const sections = readdirSync('out').filter((f) => /^seg-\d+\.mp4$/.test(f)).sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10));
writeFileSync('out/list.txt', sections.map((f) => "file '" + f + "'").join('\n') + '\n');
run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/list.txt', '-c', 'copy', 'out/video.mp4']);
run('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'out/video.mp4', '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', 'output/thrivit-reel.part.mp4']);
renameSync('output/thrivit-reel.part.mp4', 'output/thrivit-reel.mp4');
run('node', ['render.js', 'stills', 'out/cover', '32.4']);
copyFileSync('out/cover/still-32.40.jpg', 'output/thrivit-reel-cover.jpg');
console.log('done: output/thrivit-reel.mp4');
