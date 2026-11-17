"""Gera a mesma frase com cada voz (Piper, Kokoro offline; edge-tts online) e monta um comparativo.
uso: py audio/comparar_vozes.py <pasta dos modelos> <pasta de saída>"""
import asyncio, os, sys, time, wave
import numpy as np
import soundfile as sf

MODELS, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
TEXT = ("O Brasil inteiro ficou com medo de um apagão que ninguém anunciou. "
        "No grupo da família, a mensagem: dia dezessete, o mundo fica sem luz.")
SR = 24000
res = []

def save(name, x, sr, secs):
    x = np.asarray(x, dtype=np.float32)
    if x.ndim > 1: x = x.mean(axis=1)
    if sr != SR:
        n = int(len(x) * SR / sr); x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    x = x / (np.abs(x).max() + 1e-9) * 0.8
    sf.write(os.path.join(OUT, f"{name}.wav"), x, SR)
    res.append((name, secs, len(x) / SR))

# ---- Piper (offline) ----
from piper import PiperVoice, SynthesisConfig
for v in ["faber", "cadu", "jeff"]:
    t0 = time.time()
    voice = PiperVoice.load(os.path.join(MODELS, f"pt_BR-{v}-medium.onnx"))
    tmp = os.path.join(OUT, "_tmp.wav")
    with wave.open(tmp, "wb") as wf:
        voice.synthesize_wav(TEXT, wf, syn_config=SynthesisConfig(length_scale=0.85))
    x, sr = sf.read(tmp)
    save(f"piper-{v}", x, sr, time.time() - t0)

# ---- Kokoro (offline) ----
from kokoro_onnx import Kokoro
k = Kokoro(os.path.join(MODELS, "kokoro-v1.0.int8.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
for v in ["pm_alex", "pm_santa", "pf_dora"]:
    t0 = time.time()
    x, sr = k.create(TEXT, voice=v, speed=1.15, lang="pt-br")
    save(f"kokoro-{v.split('_')[1]}", x, sr, time.time() - t0)

# ---- edge-tts (online, the current one) ----
import edge_tts
async def edge(v, name):
    t0 = time.time(); mp3 = os.path.join(OUT, "_tmp.mp3")
    await edge_tts.Communicate(TEXT, v, rate="+24%").save(mp3)
    os.system(f'ffmpeg -y -loglevel error -i "{mp3}" -ar {SR} -ac 1 "{os.path.join(OUT, "_tmp2.wav")}"')
    x, sr = sf.read(os.path.join(OUT, "_tmp2.wav")); save(name, x, sr, time.time() - t0)
for v, n in [("pt-BR-AntonioNeural", "edge-antonio-ATUAL"), ("pt-BR-FranciscaNeural", "edge-francisca"), ("pt-BR-ThalitaMultilingualNeural", "edge-thalita")]:
    asyncio.run(edge(v, n))
for f in ["_tmp.wav", "_tmp.mp3", "_tmp2.wav"]:
    p = os.path.join(OUT, f)
    if os.path.exists(p): os.remove(p)

# ---- one file with all of them, a short beep between ----
beep = (0.25 * np.sin(2 * np.pi * 880 * np.arange(int(0.12 * SR)) / SR)).astype(np.float32)
gap = np.zeros(int(0.5 * SR), np.float32)
allx = []
for name, *_ in res:
    allx += [beep, gap[: SR // 4], sf.read(os.path.join(OUT, f"{name}.wav"))[0].astype(np.float32), gap]
sf.write(os.path.join(OUT, "comparativo.wav"), np.concatenate(allx), SR)
print("ordem no comparativo.wav (um bipe antes de cada):")
for i, (name, secs, dur) in enumerate(res, 1):
    print(f"{i:2d}. {name:22s} gerou {dur:4.1f} s de fala em {secs:5.1f} s")
