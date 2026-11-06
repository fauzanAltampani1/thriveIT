"""An original chiptune / lo-fi bed for the reel, synthesised here (no samples), so it is free to use anywhere.
A minor, 120 BPM, Am-F-C-G. It follows the reel: a quiet pad while the question types, a hit on the logo,
the groove building through the PC, drum and cards, a breakdown on the envelope, a last hit on the sign-off.
usage: python3 music.py events.json music.wav"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
info = json.load(open(sys.argv[1]))
DUR = info['duration']
N = int(round(DUR * SR))
TL = {}
for e in info['events']:
    TL.setdefault(e['k'], []).append(e['t'])
SWEEPS = sorted(TL['sweep'])                       # the four torn swaps
LOGO_HIT = min(TL['chime']) - 0.75                 # logo starts glitching in
END_HIT = max(TL['chime'])                         # sign-off logo lands clean
GROOVE_IN, BASS_IN = SWEEPS[0] + 0.9, SWEEPS[1] + 0.9
BREAK, BREAK_END = SWEEPS[3], END_HIT - 0.6

BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)

def t_(d): return np.arange(int(d * SR)) / SR
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, min(na, n)); e[-nr:] *= np.linspace(1, 0, min(nr, n)); return e
def add(x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    a = max(0, -i); i = max(0, i); m = min(len(x) - a, N - i)
    ang = (pan + 1) * np.pi / 4
    L[i:i + m] += x[a:a + m] * gain * np.cos(ang) * np.sqrt(2)
    R[i:i + m] += x[a:a + m] * gain * np.sin(ang) * np.sqrt(2)
def square(f, d, duty=0.5): return np.where((t_(d) * f) % 1 < duty, 1.0, -1.0)
def tri(f, d): return 2 * np.abs(2 * ((t_(d) * f) % 1) - 1) - 1
def saw(f, d): return 2 * ((t_(d) * f) % 1) - 1

NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
# Am, F, C, G: bass root and three chord tones (midi)
CHORDS = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [60, 64, 67]), (43, [55, 59, 62])]
chord_at = lambda t: CHORDS[int(t // (4 * BEAT)) % 4]
def in_groove(t): return GROOVE_IN <= t < BREAK
def in_bass(t): return BASS_IN <= t < BREAK

# ---------- pad: soft detuned saws through a low-pass, one chord per bar ----------
pad = np.zeros(N)
bar = 4 * BEAT
for b in range(int(DUR / bar) + 2):
    t0 = b * bar
    if t0 >= DUR: break
    root, tones = chord_at(t0)
    d = bar + 0.6
    x = sum(saw(NOTE(m) * (1 + dt), d) for m in tones for dt in (-0.004, 0.004)) / 6
    cut = 900 if t0 < GROOVE_IN or t0 >= BREAK else 1500
    x = filt(x, 'low', cut) * env(len(x), 0.35, 0.5)
    i = int(t0 * SR); m = min(len(x), N - i); pad[i:i + m] += x[:m]

# ---------- arpeggio: 16th-note square chord tones an octave up, filter opening with the groove ----------
arp = np.zeros(N)
pattern = [0, 1, 2, 1, 2, 0, 1, 2]
step = BEAT / 4
for k in range(int(DUR / step)):
    t0 = k * step
    if t0 < 0.4 or (LOGO_HIT - 0.1 < t0 < LOGO_HIT + 0.8) or t0 >= DUR - 1.0: continue
    _, tones = chord_at(t0)
    m = tones[pattern[k % 8]] + 12
    x = square(NOTE(m), step * 0.9, 0.25) * np.exp(-t_(step * 0.9) / 0.07)
    bright = 1100 if t0 < GROOVE_IN else (2600 if t0 < BREAK else 1600)
    x = filt(x, 'low', bright)
    i = int(t0 * SR); n = min(len(x), N - i); arp[i:i + n] += x[:n] * (0.8 if k % 4 == 0 else 0.55)

# ---------- bass: 8th-note triangle pulses on the root ----------
bass = np.zeros(N)
for k in range(int(DUR / (BEAT / 2))):
    t0 = k * BEAT / 2
    if not in_bass(t0): continue
    root, _ = chord_at(t0)
    f = NOTE(root + (12 if root < 45 else 0))
    x = (tri(f, BEAT / 2 * 0.85) + 0.25 * square(f, BEAT / 2 * 0.85)) * env(int(BEAT / 2 * 0.85 * SR), 0.004, 0.05)
    x = filt(x, 'low', 900)
    i = int(t0 * SR); n = min(len(x), N - i); bass[i:i + n] += x[:n]

# ---------- drums ----------
def kick():
    d = 0.32; t = t_(d); ph = 2 * np.pi * np.cumsum(55 + 110 * np.exp(-t / 0.035)) / SR
    return np.sin(ph) * np.exp(-t / 0.12) + filt(rng.standard_normal(len(t)), 'band', [1500, 5000]) * np.exp(-t / 0.003) * 0.3
def hat(open_=False):
    d = 0.12 if open_ else 0.04; t = t_(d)
    return filt(rng.standard_normal(len(t)), 'high', 7000) * np.exp(-t / (0.04 if open_ else 0.012))
def clap():
    d = 0.25; t = t_(d); x = filt(rng.standard_normal(len(t)), 'band', [900, 4000])
    e = np.exp(-t / 0.06); e[:int(0.03 * SR)] *= (np.sin(np.arange(int(0.03 * SR)) / SR * 2 * np.pi * 100) > 0)
    return x * e
duck = np.ones(N)                                   # the pad and arp breathe with the kick
for k in range(int(DUR / BEAT)):
    t0 = k * BEAT
    if in_groove(t0):
        add(kick(), t0, 0.55 if t0 < BASS_IN else 0.7)
        i = int(t0 * SR); n = min(int(0.22 * SR), N - i)
        duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.45 * np.exp(-np.arange(n) / (0.07 * SR)))
        add(hat(), t0 + BEAT / 2, 0.16, 0.3)
        if t0 >= BASS_IN:
            add(hat(), t0 + BEAT / 4, 0.07, -0.3); add(hat(), t0 + 3 * BEAT / 4, 0.07, -0.3)
            if k % 2 == 1: add(clap(), t0, 0.32, 0.05)
            if k % 8 == 7: add(hat(True), t0 + BEAT / 2, 0.12, 0.3)

# ---------- hits and risers ----------
def impact():
    d = 2.2; t = t_(d); ph = 2 * np.pi * np.cumsum(38 + 70 * np.exp(-t / 0.08)) / SR
    boom = np.sin(ph) * np.exp(-t / 0.5)
    crash = filt(rng.standard_normal(len(t)), 'high', 4000) * np.exp(-t / 0.6) * 0.25
    return boom + crash
def riser(d):
    t = t_(d); p = t / d
    x = filt(rng.standard_normal(len(t)), 'band', [400, 6000]) * p ** 2
    return x * env(len(t), 0.05, 0.02)
add(riser(0.9), LOGO_HIT - 0.9, 0.18)
add(impact(), LOGO_HIT, 0.5)
add(riser(1.2), END_HIT - 1.2, 0.2)
add(impact(), END_HIT, 0.55)
add(kick(), END_HIT, 0.7)
root, tones = CHORDS[0]                             # last Am stab, held into the fade
stab = sum(square(NOTE(m), 2.5, 0.25) for m in tones + [tones[0] + 12]) / 4
add(filt(stab, 'low', 2400) * np.exp(-t_(2.5) / 0.9), END_HIT, 0.28)

# ---------- mix the bed ----------
tonal = (pad * 0.55 + arp * 0.22 + bass * 0.45) * duck
L += tonal; R += tonal
# a little room: short noise-burst reverb on everything
ir_n = int(1.2 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / (0.35 * SR)); ir /= np.abs(ir).sum() / 6
L = L + 0.18 * fftconvolve(L, ir)[:N]
R = R + 0.18 * fftconvolve(R, np.roll(ir, 97))[:N]
mix = np.stack([L, R])
mix = filt(mix, 'high', 30)
fade = np.ones(N); nf = int(2.0 * SR); fade[-nf:] = np.linspace(1, 0, nf) ** 1.5
fi = int(0.6 * SR); fade[:fi] *= np.linspace(0, 1, fi)
mix *= fade
mix = np.tanh(1.2 * mix / np.abs(mix).max()) / np.tanh(1.2) * 0.7
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype('<i2').tobytes())
print('wrote', sys.argv[2], round(DUR, 1), 's')
