"""Lays the voiceover over the sound design: the read is split at its pauses into lines, each line starts on its scene,
and the effects (and the music, if given) duck under the voice.
usage: python3 voice.py voiceover.mp3 sfx.wav out.wav [music.wav]"""
import subprocess
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
# where each line of the script starts in the reel (seconds); the read's own pauses split it into these lines
STARTS = [0.1, 2.45, 6.75, 10.6, 16.75, 18.85, 20.25, 24.3, 28.9]
DUCK_DB = -9          # effects level while someone is speaking
MUSIC_GAIN = 0.55     # music under the effects
MUSIC_DUCK_DB = -11   # music level while someone is speaking

src, sfx_path, out = sys.argv[1:4]
music_path = sys.argv[4] if len(sys.argv) > 4 else None
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
v = np.frombuffer(raw, '<f4').astype(np.float64)

# the read's sentence breaks (seconds into the file), found from its pauses; each piece is trimmed to its speech
CUTS = [1.95, 6.37, 8.57, 14.34, 16.67, 18.22, 20.35, 23.55]
fr = int(0.02 * SR)
rms = np.sqrt(np.convolve(v ** 2, np.ones(fr) / fr, 'same'))
loud = np.flatnonzero(rms > 10 ** (-40 / 20))
edges = [0] + [int(c * SR) for c in CUTS] + [len(v)]
lines = []
for a, b in zip(edges[:-1], edges[1:]):
    inside = loud[(loud >= a) & (loud < b)]
    lines.append(v[max(a, inside[0] - int(0.03 * SR)):min(b, inside[-1] + int(0.08 * SR))])
assert len(lines) == len(STARTS)

with wave.open(sfx_path) as w:
    sfx = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(np.float64) / 32768
N = len(sfx)
voice = np.zeros(N)
for t, seg in zip(STARTS, lines):
    i = int(t * SR); m = min(len(seg), N - i)
    voice[i:i + m] += seg[:m]
    print(f'line at {t:5.2f}s  {len(seg) / SR:4.2f}s  ends {t + len(seg) / SR:5.2f}s')

# clean the voice a little: rumble out, gentle presence
voice = sosfilt(butter(2, 80, 'high', fs=SR, output='sos'), voice)
voice *= 0.7 / max(1e-9, np.abs(voice).max())
# duck: follow the voice's loudness with a fast attack and a slow release
env = np.abs(voice)
att, rel = np.exp(-1 / (0.01 * SR)), np.exp(-1 / (0.25 * SR))
fol = np.zeros(N); acc = 0.0
for i in range(N):
    x = env[i]; acc = att * acc + (1 - att) * x if x > acc else rel * acc + (1 - rel) * x; fol[i] = acc
duck = 1 - (1 - 10 ** (DUCK_DB / 20)) * np.clip(fol / 0.05, 0, 1)
mix = sfx * duck[:, None] * 0.8 + voice[:, None]
if music_path:
    with wave.open(music_path) as w:
        mus = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(np.float64) / 32768
    mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))[:N]
    mduck = 1 - (1 - 10 ** (MUSIC_DUCK_DB / 20)) * np.clip(fol / 0.05, 0, 1)
    mix += mus * mduck[:, None] * MUSIC_GAIN
mix *= 0.89 / np.abs(mix).max()
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes())
print('wrote', out)
