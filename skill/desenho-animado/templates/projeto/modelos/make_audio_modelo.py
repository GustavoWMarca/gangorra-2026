"""Som de __TITULO__: trilha original + efeitos sintetizados, voz intocada (modelo genérico do comando novo).
uso: chamado pelo npm run produzir -- __nome__"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, ns, rng, place, pan, st, dbg, lp, hp, read_wav, write_wav, integrated, phase, colored
import instruments as I
import sfx_gen as G

OUT = sys.argv[1]
TM = json.load(open(os.path.join(OUT, "timing.json"), encoding="utf-8"))  # node scripts/timing-json.mjs src/videos/apagao out/apagao/timing.json
FPS, TOTAL = TM["FPS"], TM["TOTAL"]
DUR = TOTAL / FPS
N = ns(DUR)
W = json.load(open(os.path.join(OUT, "words.json"), encoding="utf-8"))
T = TM["T"]                                   # MSG, SEMLUZ, ALARME, KIT, AGUA, ... (story.ts T_*)
SH = {s["id"]: s["a"] for s in TM["SHOTS"]}
s_ = lambda i: SH[i] / FPS
RELIEF = s_(len(SH))
cues = []
cue = lambda t, w: cues.append((t, w))

def P(x, p=0.0):
    x = np.asarray(x, float)
    return pan(x, p) if x.ndim == 1 else x

def tone(f0, f1, d, amp=0.4, shape="sin"):
    f = np.geomspace(f0, f1, ns(d)) if f0 != f1 else np.full(ns(d), f0)
    x = np.sin(phase(f)) if shape == "sin" else np.sign(np.sin(phase(f))) * 0.5
    k = ns(0.006); x[:k] *= np.linspace(0, 1, k); x[-k:] *= np.linspace(1, 0, k)
    return x * amp

# ---------------------------------------------------------------- music
Q = 0.6   # 100 bpm
BAR = 4 * Q
MIN = {"Am": [57, 60, 64], "F": [53, 57, 60], "G": [55, 59, 62], "E": [52, 56, 59], "Dm": [50, 53, 57], "C": [60, 64, 67]}
def section(t):
    s = next((x for x in TM["SHOTS"] if x["a"] / FPS <= t < x["b"] / FPS), TM["SHOTS"][-1])
    return "relief" if s["id"] == len(TM["SHOTS"]) else ("worry" if s["light"] == "golden" else "gossip")

def music():
    r = rng(17)
    buf = np.zeros((2, N))
    prog_min = ["Am", "F", "G", "E"]
    prog_maj = ["C", "G", "Am", "F"]
    b = 0
    while b * BAR < DUR:
        t0 = b * BAR
        sec = section(t0 + 0.01)
        name = (prog_maj if sec == "relief" else prog_min)[b % 4]
        notes = MIN[name]
        if sec != "dark":
            place(buf, P(I.pad([I.m2f(n) for n in notes], BAR + 0.2, vel=0.3, r=r, att=0.2, rel=0.4)), t0, 0.45)
        for k in range(4):
            tb = t0 + k * Q
            if tb >= DUR - 0.3: break
            s2 = section(tb + 0.01)
            if s2 == "dark": continue
            place(buf, P(I.pluck(I.m2f(notes[0] - 24), vel=0.7, r=r, dur=0.4, bright=0.3), -0.05), tb, 0.85)
            # sneaky pizzicato arpeggio on the off-beats
            if s2 in ("worry", "gossip", "build"):
                place(buf, P(I.pluck(I.m2f(notes[(k + b) % 3] + 12), vel=0.45, r=r, dur=0.25, bright=0.7), 0.25), tb + Q / 2, 0.55)
            if s2 == "gossip" and k % 2 == 1:
                place(buf, P(I.brush(0.35, r), 0.2), tb, 0.5)
            if s2 == "relief":
                place(buf, P(I.glock(I.m2f(notes[(k + b) % 3] + 12), vel=0.45, r=r, dur=1.0), 0.3), tb, 0.5)
                if k % 2: place(buf, P(I.snare(vel=0.4, r=r), 0.1), tb, 0.4)
                else: place(buf, P(I.timpani(I.m2f(36), vel=0.4, r=r, dur=0.6)), tb, 0.45)
        b += 1
    e = ns(0.6); buf[:, -e:] *= np.linspace(1, 0, e)
    return buf

# ---------------------------------------------------------------- effects
def cheer(buf, t, dur, n, seed, g=1.0):
    r = rng(seed)
    place(buf, G.applause(dur, r, people=n), t, 0.5 * g)
    for k in range(min(n, 8)):
        place(buf, P(G.hurrah(r, base=r.uniform(120, 240), scale=r.uniform(0.95, 1.15)), r.uniform(-0.5, 0.5)), t + r.uniform(0, 0.5), 0.45 * g)

def power_down(buf, t, g=1.0):
    x = tone(220, 38, 1.1, 0.5) + 0.5 * tone(110, 19, 1.1, 0.5)
    x *= np.linspace(1, 0, x.size) ** 0.6
    place(buf, P(x), t, 0.6 * g)
    z = hp(colored(ns(0.25), rng(int(t * 10)), 0.0), 2500) * np.exp(-np.arange(ns(0.25)) / SR / 0.05)
    place(buf, P(z * 0.5), t, 0.5 * g)

def power_up(buf, t):
    x = tone(40, 180, 0.6, 0.4) * np.linspace(0, 1, ns(0.6))
    place(buf, P(x), t - 0.3, 0.5)

def effects():
    """efeitos genéricos: ambiente por luz (dia: brisa + passarinhos; fim de tarde: grilos), murmúrio, whoosh em cada
    troca de cena e um toque em cada tempo T_* do story. Acrescente aqui os efeitos próprios do vídeo."""
    buf = np.zeros((2, N))
    r = rng(5)
    for s in TM["SHOTS"]:
        a, b = s["a"] / FPS, s["b"] / FPS
        if s["light"] == "day":
            place(buf, G.breeze(b - a, rng(int(a * 10) + 1), level=0.6), a, 0.3)
            place(buf, st(G.bird_chirps(b - a, rng(int(a * 10) + 2), density=0.4)), a, 0.2)
        else:
            place(buf, st(G.crickets(b - a, rng(int(a) + 3))), a, 0.25)
        if a > 0:
            place(buf, G.whoosh(0.6, rng(int(a * 7) + 9), peak=0.6), a - 0.35, 0.25); cue(a, f"cena {s['id']}: whoosh")
    for k in range(4):
        place(buf, P(G.babble(DUR, rng(40 + k), base=110 + 30 * k, scale=1 + 0.03 * k), -0.5 + 0.33 * k), 0, 0.05)
    for i, (name, t) in enumerate(sorted(T.items(), key=lambda x: x[1])):
        place(buf, P(I.pluck(I.m2f(67 + 2 * (i % 5)), vel=0.6, r=r, dur=0.3, bright=0.8), 0.2), t - 0.03, 0.4); cue(t, f"toque em {name}")
    e = ns(0.6); buf[:, -e:] *= np.linspace(1, 0, e)
    return buf
# ---------------------------------------------------------------- mix
def spans(words, merge=0.3):
    out = []
    for w in words:
        if out and w["t0"] - out[-1][1] < merge: out[-1][1] = w["t1"]
        else: out.append([w["t0"], w["t1"]])
    return out

def duck(depth_db=-3.0, rel=0.45):
    g = np.zeros(N)
    for a, b in spans(W):
        g[ns(max(0, a - 0.08)):ns(min(DUR, b + 0.12))] = 1.0
    k = int(SR * rel); g = np.convolve(g, np.ones(k) / k, mode="same")
    return dbg(depth_db * np.clip(g * 1.6, 0, 1))

def main():
    v, _ = read_wav(os.path.join(OUT, "voice.wav"))
    v = st(v)
    v = v[:, :N] if v.shape[1] >= N else np.pad(v, ((0, 0), (0, N - v.shape[1])))
    m, s = music(), effects()
    Lv = integrated(v)
    m = m * dbg(Lv - 14 - integrated(m) + 3.0) * duck()
    s = s * dbg(Lv - 9 - integrated(s) - 6.0)
    write_wav(os.path.join(OUT, "music.wav"), m); write_wav(os.path.join(OUT, "sfx.wav"), s)
    x = v + m + s
    x = x * dbg(-14.0 - integrated(x))
    c = dbg(-1.2)
    x = np.where(np.abs(x) > 0.8 * c, np.sign(x) * (0.8 * c + 0.2 * c * np.tanh((np.abs(x) - 0.8 * c) / (0.2 * c))), x)
    write_wav(os.path.join(OUT, "mix.wav"), x)
    with open(os.path.join(OUT, "cues.md"), "w", encoding="utf-8") as f:
        f.write(f"# cues\n\nvoz {Lv:.1f} LUFS | mix {integrated(x):.1f} LUFS | pico {20*np.log10(np.abs(x).max()):.1f} dBFS | {DUR:.3f} s\n\n")
        for t, w in sorted(cues): f.write(f"- {t:6.2f} s (quadro {round(t*FPS)}): {w}\n")
    print("ok", round(integrated(x), 1), "LUFS", x.shape[1] / SR, "s")

main()
