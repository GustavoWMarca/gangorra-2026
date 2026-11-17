"""Som do "A gangorra de 2026": trilha original + efeitos sintetizados, voz intocada.
uso: py audio/make_audio.py out/eleicoes
Saídas: music.wav, sfx.wav (stems), mix.wav (48 kHz, duração exata do vídeo), cues.md
Mixagem: música +3 dB, efeitos -6 dB em relação à base; música abaixa 3 dB sob a voz."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, ns, rng, place, pan, st, dbg, lp, hp, read_wav, write_wav, integrated, true_peak, tt, phase
import instruments as I
import sfx_gen as G

OUT = sys.argv[1]
FPS, TOTAL = 30, 1160
DUR = TOTAL / FPS
N = ns(DUR)
W = json.load(open(os.path.join(OUT, "words.json"), encoding="utf-8"))

# word times (s), same as story.ts
T_GANHOU, T_FRENTE, T_LULA1, T_NINGUEM, T_SEGUNDO = 4.354, 10.575, 11.643, 14.234, 17.823
T_ZERA, T_QUEM, T_LADO, T_LEVA, T_RECORDE, T_FEZ = 22.55, 23.327, 25.554, 26.794, 31.421, 34.375
SHOT = {1: 0, 2: 162, 3: 276, 4: 417, 5: 494, 6: 573, 7: 795, 8: 1020}
st_ = lambda i: SHOT[i] / FPS
cues = []

def P(x, p=0.0):
    x = np.asarray(x, float)
    return pan(x, p) if x.ndim == 1 else x

def cue(t, what):
    cues.append((t, what))

# ---------------------------------------------------------------- music
Q = 0.5                     # 120 bpm
BAR = 4 * Q
CH = {"C": [60, 64, 67], "G": [55, 59, 62], "Am": [57, 60, 64], "F": [53, 57, 60], "Em": [52, 55, 59], "Dm": [50, 53, 57],
      "E": [52, 56, 59], "Gsus": [55, 60, 62]}
PROG = ["C", "G", "Am", "F", "C", "G", "Am", "Em", "Dm", "E", "F", "Gsus", "Am", "F", "Dm", "G", "C", "G", "Am", "F"]

def section(t):
    if t < st_(2): return "hook"
    if t < st_(5): return "tense" if t >= T_FRENTE else "light"
    if t < st_(6): return "golden"
    if t < T_LADO: return "build"
    return "party"

def music():
    r = rng(2026)
    buf = np.zeros((2, N))
    for b, name in enumerate(PROG):
        t0 = b * BAR
        if t0 >= DUR: break
        notes = CH[name]
        sec = section(t0 + 0.01)
        # pad
        pv = {"hook": 0.35, "light": 0.3, "tense": 0.35, "golden": 0.45, "build": 0.35, "party": 0.4}[sec]
        place(buf, P(I.pad([I.m2f(n) for n in notes], BAR + 0.2, vel=pv, r=r, att=0.15, rel=0.4), 0.0), t0, 0.5)
        for k in range(4):
            tb = t0 + k * Q
            if tb >= DUR - 0.3: break
            s2 = section(tb + 0.01)
            # plucked bass: root on beats, fifth on the "and" in party/hook
            root = I.m2f(notes[0] - 24)
            place(buf, P(I.pluck(root, vel=0.75, r=r, dur=0.45, bright=0.35), -0.05), tb, 0.9)
            if s2 in ("hook", "party", "build"):
                place(buf, P(I.pluck(I.m2f(notes[2] - 24), vel=0.5, r=r, dur=0.3, bright=0.3), -0.05), tb + Q / 2, 0.7)
            # drums
            if s2 in ("hook", "party"):
                if k % 2 == 0: place(buf, P(I.timpani(I.m2f(36), vel=0.5, r=r, dur=0.6), 0), tb, 0.55)
                else: place(buf, P(I.snare(vel=0.6, r=r), 0.1), tb, 0.55)
                place(buf, P(I.brush(0.35, r), 0.3), tb + Q / 2, 0.5)
            elif s2 in ("light", "build"):
                place(buf, P(I.brush(0.4 if k % 2 else 0.3, r), 0.25), tb, 0.55)
            elif s2 == "tense":
                if k % 2 == 1: place(buf, P(I.snare(vel=0.35, r=r, buzz=True), 0.1), tb, 0.45)
            # glock arpeggio (original pattern) in hook / party, sparse in light
            if s2 in ("hook", "party") or (s2 == "light" and k % 2 == 0):
                pat = [0, 1, 2, 1] if b % 2 == 0 else [2, 1, 0, 2]
                for e, i in enumerate(pat[:2]):
                    te = tb + e * Q / 2
                    nn = notes[(i + k) % 3] + 12
                    place(buf, P(I.glock(I.m2f(nn), vel=0.45 if s2 != "light" else 0.3, r=r, dur=1.0), 0.3), te, 0.45)
    # snare roll into "lado", cymbal + timpani hit on it
    for k in range(28):
        tk = T_LADO - 1.4 + k * 0.05
        place(buf, P(I.snare(vel=0.15 + 0.6 * k / 28, r=r, dur=0.12), 0.1), tk, 0.5)
    for t, v in [(T_GANHOU, 0.7), (T_LADO, 0.9)]:
        place(buf, P(I.cymbal(v, r), 0.2), t, 0.6)
        place(buf, P(I.timpani(I.m2f(36), vel=v, r=r), 0), t, 0.8)
    place(buf, P(I.triangle(0.6, r), 0.4), T_FEZ, 0.5)
    for i, n in enumerate([72, 76, 79, 84]):
        place(buf, P(I.glock(I.m2f(n), vel=0.6, r=r, dur=1.4), 0.3), T_FEZ + 0.08 * i, 0.6)
    # end: fade the last 0.6 s
    e = ns(0.6)
    buf[:, -e:] *= np.linspace(1, 0, e)
    return buf

# ---------------------------------------------------------------- effects
def crowd_cheer(buf, t, dur, p, n, seed, g=1.0):
    r = rng(seed)
    place(buf, G.applause(dur, r, people=n), t, 0.6 * g)
    for k in range(min(n, 8)):
        x = G.hurrah(r, base=r.uniform(120, 240), scale=r.uniform(0.95, 1.15))
        place(buf, P(x, float(np.clip(p + r.uniform(-0.3, 0.3), -1, 1))), t + r.uniform(0, 0.5), 0.5 * g)

def seesaw_thump(buf, t, p, big=1.0, seed=0):
    r = rng(seed)
    place(buf, P(G.wood_crack(r), p), t, 0.45 * big)

def creak_at(buf, t, dur, p, seed):
    r = rng(seed)
    place(buf, P(G.creak(dur, r, rate0=70, rate1=130), p), t, 0.5)

def beep(f, d):
    x = np.sin(phase(np.full(ns(d), f))) * 0.4
    k = ns(0.004); x[:k] *= np.linspace(0, 1, k); x[-k:] *= np.linspace(1, 0, k)
    return x

def effects():
    buf = np.zeros((2, N))
    r = rng(7)
    # day bed: breeze + birds; golden: crickets
    for a, b in [(0, st_(5)), (st_(6), st_(8))]:
        place(buf, G.breeze(b - a, rng(int(a * 10) + 1), level=0.6), a, 0.35)
        place(buf, st(G.bird_chirps(b - a, rng(int(a * 10) + 2), density=0.4)), a, 0.25)
    for a, b in [(st_(5), st_(6)), (st_(8), DUR)]:
        place(buf, st(G.crickets(b - a, rng(int(a) + 3))), a, 0.3)
    # crowd murmur under everything
    for k in range(6):
        place(buf, P(G.babble(DUR, rng(40 + k), base=110 + 25 * k, scale=1 + 0.03 * k), -0.6 + 0.25 * k), 0, 0.05)
    # hook: blue cheer, creak, flip
    crowd_cheer(buf, 0.1, 3.8, -0.6, 10, 11, 0.5); cue(0.1, "torcida azul (gancho)")
    creak_at(buf, T_GANHOU - 0.45, 0.6, 0.0, 12); seesaw_thump(buf, T_GANHOU, 0.2, 1.0, 13); cue(T_GANHOU, "gangorra vira + pancada")
    crowd_cheer(buf, T_GANHOU + 0.05, 1.2, 0.4, 14, 14, 1.0); cue(T_GANHOU, "torcida vermelha")
    place(buf, G.whoosh(0.6, rng(15), peak=0.6), st_(2) - 0.35, 0.35); cue(st_(2), "flash: whoosh")
    # urna: steps + generic electronic beeps
    for k in range(18):
        place(buf, P(G.stroll_step(rng(100 + k)), -0.5 + (k % 7) * 0.15), st_(2) + 0.2 + k * 0.2 + r.uniform(0, 0.05), 0.25)
    for i, (f, d) in enumerate([(1320, 0.07), (1320, 0.07), (1760, 0.18)]):
        place(buf, P(beep(f, d), -0.4), 7.2 + i * 0.11, 0.25)
    cue(7.2, "bipes da urna")
    # 1º turno: tilt to blue
    creak_at(buf, T_FRENTE - 0.4, 0.5, -0.3, 20); seesaw_thump(buf, T_FRENTE, -0.4, 0.7, 21)
    crowd_cheer(buf, T_FRENTE + 0.05, 1.3, -0.5, 10, 22, 0.8); cue(T_FRENTE, "pende pro azul + torcida")
    place(buf, G.whoosh(0.9, rng(23), peak=0.5), T_LULA1 - 0.15, 0.25); cue(T_LULA1, "câmera desliza")
    # wobble
    for k in range(3):
        creak_at(buf, st_(4) + 0.1 + k * 0.45, 0.35, 0.0, 30 + k)
    cue(T_NINGUEM, "gangorra balança")
    place(buf, G.whoosh(0.8, rng(34), peak=0.6, f_lo=250, f_hi=1200), st_(5) - 0.4, 0.25)
    creak_at(buf, T_SEGUNDO - 0.3, 0.8, 0.0, 35); cue(T_SEGUNDO, "nivela")
    place(buf, G.whoosh(0.8, rng(36), peak=0.6), st_(6) - 0.4, 0.2)
    # runoff: the greys run to their sides
    for k in range(26):
        tk = T_QUEM - 0.5 + k * 0.1
        place(buf, P(G.stroll_step(rng(200 + k), scuff=0.3), -0.6 if k % 2 else 0.6), tk, 0.2)
    cue(T_QUEM, "corrida dos 11")
    creak_at(buf, T_LADO - 0.5, 0.6, 0.3, 40); seesaw_thump(buf, T_LADO, 0.3, 1.1, 41)
    crowd_cheer(buf, T_LADO + 0.05, 2.5, 0.4, 18, 42, 1.0); cue(T_LADO, "vira pro vermelho + festa")
    # final party
    crowd_cheer(buf, st_(7) + 0.2, DUR - st_(7) - 0.3, 0.2, 24, 50, 0.5); cue(st_(7), "festa")
    crowd_cheer(buf, T_FEZ - 0.05, 2.0, 0.1, 12, 60, 0.9); cue(T_FEZ, "bolo: viva")
    e = ns(0.6); buf[:, -e:] *= np.linspace(1, 0, e)
    return buf

# ---------------------------------------------------------------- mix
def spans(words, merge=0.3):
    out = []
    for w in words:
        if out and w["t0"] - out[-1][1] < merge: out[-1][1] = w["t1"]
        else: out.append([w["t0"], w["t1"]])
    return out

def duck(depth_db=-3.0, att=0.07, rel=0.45):
    g = np.zeros(N)
    for a, b in spans(W):
        i0, i1 = ns(max(0, a - 0.08)), ns(min(DUR, b + 0.12))
        g[i0:i1] = 1.0
    k = int(SR * rel); ker = np.ones(k) / k
    g = np.convolve(g, ker, mode="same")
    return dbg(depth_db * np.clip(g * 1.6, 0, 1))

def main():
    v, sr = read_wav(os.path.join(OUT, "voice.wav"))
    v = st(v)
    v = v[:, :N] if v.shape[1] >= N else np.pad(v, ((0, 0), (0, N - v.shape[1])))
    m, s = music(), effects()
    Lv = integrated(v)
    Lm, Ls = integrated(m), integrated(s)
    # base balance: music 14 LU under the voice, effects 9 LU under; then the house rule +3 / -6 dB
    m = m * dbg(Lv - 14 - Lm + 3.0)
    s = s * dbg(Lv - 9 - Ls - 6.0)
    m = m * duck()
    write_wav(os.path.join(OUT, "music.wav"), m)
    write_wav(os.path.join(OUT, "sfx.wav"), s)
    x = v + m + s
    x = x * dbg(-14.0 - integrated(x))
    # soft limiter at -1.2 dBFS
    c = dbg(-1.2)
    x = np.where(np.abs(x) > 0.8 * c, np.sign(x) * (0.8 * c + 0.2 * c * np.tanh((np.abs(x) - 0.8 * c) / (0.2 * c))), x)
    write_wav(os.path.join(OUT, "mix.wav"), x)
    with open(os.path.join(OUT, "cues.md"), "w", encoding="utf-8") as f:
        f.write(f"# cues\n\nvoz {Lv:.1f} LUFS | mix {integrated(x):.1f} LUFS | pico {20*np.log10(np.abs(x).max()):.1f} dBFS | {DUR:.3f} s\n\n")
        for t, w in sorted(cues): f.write(f"- {t:6.2f} s (quadro {round(t*FPS)}): {w}\n")
    print("ok", round(integrated(x), 1), "LUFS", x.shape[1] / SR, "s")

main()
