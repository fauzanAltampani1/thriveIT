"""Pixel-style sound design for the reel, synthesised from the cue list the page exports.
usage: python3 sfx.py events.json out.wav"""
import json
import sys
import wave

import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
info = json.load(open(sys.argv[1]))
DUR = info['duration']
N = int(round(SR * DUR))
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(20261102)


def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def filt(x, kind, f, order=2):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)


def fade(x, a=0.002, r=0.004):
    n = len(x)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e = np.ones(n)
    e[:min(na, n)] = np.linspace(0, 1, min(na, n))
    e[-min(nr, n):] *= np.linspace(1, 0, min(nr, n))
    return x * e


def square(f, d, duty=0.5):
    return np.where((tt(d) * f) % 1.0 < duty, 1.0, -1.0)


def add(sig, t, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    n = min(len(sig), N - i)
    ang = (pan + 1) * np.pi / 4
    L[i:i + n] += sig[:n] * gain * np.cos(ang) * np.sqrt(2)
    R[i:i + n] += sig[:n] * gain * np.sin(ang) * np.sqrt(2)


def pad(x, n):
    return np.concatenate([x, np.zeros(max(0, n - len(x)))])[:n]


# ---------- the sounds ----------
def key():                                    # a keyboard tick with a little body
    d = 0.03
    t = tt(d)
    click = filt(noise(d), 'band', [1800, 6000]) * np.exp(-t / 0.004)
    thock = np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.006) * 0.5
    return fade(click + thock, 0.0005, 0.005)


def glitch():                                 # bit-crushed noise with a stray square tone
    d = rng.uniform(0.035, 0.05)
    n = int(d * SR)
    hold = int(rng.integers(3, 24))
    raw = rng.uniform(-1, 1, n // hold + 1).repeat(hold)[:n]
    sq = square(rng.uniform(140, 1100), d)[:n] * 0.35
    return fade(filt(raw * 0.7 + sq, 'high', 120), 0.002, 0.006)


def zap():                                    # the squash at the end of a glitch exit
    d = 0.16
    t = tt(d)
    f = 1400 * np.exp(-t / 0.05) + 90
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 0.07)
    return fade(filt(x, 'low', 5000), 0.001, 0.02)


def chime():                                  # 8-bit "ready" arpeggio
    parts = [fade(square(f, 0.07, 0.25) * 0.8, 0.002, 0.01) for f in (659.25, 987.77, 1318.51)]
    t = tt(0.34)
    tail = square(1318.51, 0.34, 0.25) * np.exp(-t / 0.11) + np.sin(2 * np.pi * 329.63 * t) * np.exp(-t / 0.15) * 0.6
    return filt(np.concatenate(parts + [fade(tail, 0.002, 0.03)]), 'low', 7000)


def sweep(d):                                 # the torn edge crossing the screen: noise rising in pitch, with crackle
    n = int(d * SR)
    p = np.arange(n) / n
    center = 300 * 16 ** p
    x = np.zeros(n)
    for fc in (300, 600, 1200, 2400, 4800):
        band = filt(rng.standard_normal(n), 'band', [fc / 1.5, min(fc * 1.5, 20000)])
        x += band * np.exp(-(np.log2(center / fc) ** 2) / 0.5)
    env = np.sin(np.pi * p) ** 1.3
    crackle = (rng.random(n) < 0.003 * env) * rng.uniform(-1, 1, n)
    crackle = filt(crackle, 'high', 2500) * 3
    return fade((x + crackle) * env, 0.005, 0.03)


def blip(k):                                  # loading steps, rising
    return fade(square(520 + 70 * k, 0.04), 0.001, 0.01)


def line():                                   # a checklist row lands
    return fade(square(880, 0.03, 0.25) * 0.7, 0.001, 0.008)


def static(d):
    n = int(d * SR)
    raw = rng.uniform(-1, 1, n // 6 + 1).repeat(6)[:n]
    return fade(filt(raw, 'high', 300) * (0.6 + 0.4 * np.sin(2 * np.pi * 37 * tt(d))[:n]), 0.003, 0.02)


def ding():
    d = 0.5
    t = tt(d)
    x = (np.sin(2 * np.pi * 1318.5 * t) + 0.35 * square(1318.5, d, 0.25) + 0.25 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t / 0.14)
    return fade(filt(x, 'low', 8000), 0.001, 0.05)


def wood():                                   # a small wooden tick
    d = 0.02
    t = tt(d)
    return fade(np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.003) + filt(noise(d), 'band', [2000, 7000]) * np.exp(-t / 0.002) * 0.4, 0.0003, 0.003)


def clunk():
    d = 0.12
    t = tt(d)
    body = np.sin(2 * np.pi * np.cumsum(160 * np.exp(-t / 0.08) + 70) / SR) * np.exp(-t / 0.035)
    return fade(body + pad(wood(), len(body)) * 0.5, 0.0005, 0.02)


def roll(d):                                  # the drum turning one step
    out = np.zeros(int((d + 0.15) * SR))
    for k, at in enumerate((0.0, 0.11, 0.22)):
        c = wood()
        i = int(at * SR)
        out[i:i + len(c)] += c * (0.8 - 0.15 * k)
    c = clunk()
    i = int(d * 0.92 * SR)
    out[i:i + len(c)] += c[:len(out) - i]
    return out


def swish(d=0.4):
    p = np.arange(int(d * SR)) / (d * SR)
    return fade(filt(noise(d), 'band', [500, 5000]) * np.sin(np.pi * p) ** 2, 0.005, 0.02)


def thud():                                   # a card lands on the stack
    d = 0.22
    t = tt(d)
    ph = 2 * np.pi * np.cumsum(120 * np.exp(-t / 0.06) + 55) / SR
    body = np.sin(ph) * np.exp(-t / 0.07) + 0.5 * np.sin(2 * ph) * np.exp(-t / 0.04)
    c = filt(noise(0.012), 'band', [1500, 6000]) * np.exp(-tt(0.012) / 0.002)
    return fade(body + pad(c, len(body)) * 0.5, 0.0005, 0.03)


def crack():                                  # the wax seal breaks
    d = 0.3
    t = tt(d)
    x = filt(noise(d), 'band', [800, 7000]) * np.exp(-t / 0.035)
    for _ in range(14):
        i = int(rng.uniform(0, 0.16) * SR)
        c = wood()
        x[i:i + len(c)] += c * rng.uniform(0.3, 0.9)
    low = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-t / 0.05) + 50) / SR) * np.exp(-t / 0.06) * 0.8
    return fade(x + low, 0.0005, 0.03)


def flap():
    d = 0.5
    p = np.arange(int(d * SR)) / (d * SR)
    return fade(filt(noise(d), 'low', 1400) * np.sin(np.pi * p) ** 1.5, 0.01, 0.05)


def slide(d):                                 # paper sliding out of the envelope
    t = tt(d)
    p = t / d
    return fade(filt(noise(d), 'band', [1500, 6500]) * np.sin(np.pi * p) ** 1.2 * (0.7 + 0.3 * np.sin(2 * np.pi * 13 * t)), 0.01, 0.05)


def blip2():
    a = fade(square(880, 0.06, 0.25), 0.001, 0.01)
    b = fade(square(1318.5, 0.09, 0.25), 0.001, 0.02)
    return np.concatenate([a, np.zeros(int(0.03 * SR)), b])


# ---------- place every cue ----------
for e in info['events']:
    k, t = e['k'], e['t']
    if k == 'key':
        add(key(), t, rng.uniform(-0.25, 0.25), 0.16)
    elif k == 'gl':
        add(glitch(), t, rng.uniform(-0.6, 0.6), 0.10)
    elif k == 'glm':
        add(glitch(), t, rng.uniform(-0.6, 0.6), 0.07)
    elif k == 'zap':
        add(zap(), t, 0, 0.14)
    elif k == 'chime':
        add(chime(), t, 0, 0.10)
    elif k == 'sweep':
        add(sweep(e['d']), t, -0.45, 0.13)
        add(sweep(e['d']), t, 0.45, 0.13)
    elif k == 'blip':
        add(blip(e['n']), t, 0, 0.06)
    elif k == 'line':
        add(line(), t, 0.1, 0.06)
    elif k == 'static':
        add(static(e['d']), t, 0, 0.07)
    elif k == 'ding':
        add(ding(), t, 0, 0.10)
    elif k == 'roll':
        add(roll(e['d']), t, 0, 0.22)
    elif k == 'swish':
        add(swish(), t, 0, 0.10)
    elif k == 'thud':
        add(thud(), t, 0, 0.24)
    elif k == 'tick':
        add(wood(), t, 0, 0.20)
    elif k == 'crack':
        add(crack(), t, 0, 0.22)
    elif k == 'flap':
        add(flap(), t, 0, 0.12)
    elif k == 'slide':
        add(slide(e['d']), t, 0, 0.08)
    elif k == 'blip2':
        add(blip2(), t, 0, 0.08)

# ---------- master: trim the rumble, soft-limit, peak at -1 dBFS ----------
mix = np.stack([L, R])
mix = filt(mix, 'high', 35)
mix = np.tanh(1.3 * mix) / np.tanh(1.3)
mix *= 0.89 / max(1e-9, np.abs(mix).max())
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', sys.argv[2], round(DUR, 2), 's,', len(info['events']), 'cues')
