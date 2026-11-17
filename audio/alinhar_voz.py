"""Transforma a gravação do usuário (celular/WhatsApp: m4a, ogg, mp3, wav…) na narração do vídeo.
  1. limpa o áudio (ffmpeg): corta o silêncio do começo/fim, tira ronco grave e chiado leve, nivela o volume
  2. tira o tempo de cada palavra com o faster-whisper (roda no processador, sem placa de vídeo)
  3. casa com o roteiro (marcar_frases.py) e grava words.json com linha/palavra do roteiro
Saída em <pasta>: voice.wav (48 kHz mono), words_whisper.json (cru), words.json (marcado) e uma cópia de words.json em
src/videos/<nome>/ para o story.ts. Depois: node scripts/timing-json.mjs, preflight, som, render.
uso: py audio/alinhar_voz.py <gravação> <roteiro.txt> <nome do vídeo, ex. apagao> [modelo=small]
Instalação (uma vez): py -m pip install faster-whisper   (o modelo "small" baixa ~480 MB no primeiro uso)"""
import json, os, shutil, subprocess, sys

src, roteiro, nome = sys.argv[1], sys.argv[2], sys.argv[3]
modelo = sys.argv[4] if len(sys.argv) > 4 else "small"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "out", nome); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, "voice.wav")

# 1. clean: high-pass 70 Hz, light denoise, trim leading/trailing silence, EBU loudness -16 LUFS, 48 kHz mono
filt = ("highpass=f=70,afftdn=nf=-25,"
        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,"
        "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse,"
        "loudnorm=I=-16:TP=-1.5:LRA=11")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", filt, "-ar", "48000", "-ac", "1", wav], check=True)
print("áudio limpo ->", wav)

# 2. word timestamps (the script as prompt helps names and numbers)
from faster_whisper import WhisperModel
texto = open(roteiro, encoding="utf-8").read()
model = WhisperModel(modelo, device="cpu", compute_type="int8")
segs, info = model.transcribe(wav, language="pt", word_timestamps=True, initial_prompt=texto[:800], vad_filter=False)
words = []
for s in segs:
    for w in s.words or []:
        t = w.word.strip()
        if t: words.append({"w": t, "t0": round(w.start, 3), "t1": round(w.end, 3)})
json.dump(words, open(os.path.join(out, "words_whisper.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(f"whisper: {len(words)} palavras, {info.duration:.1f} s de áudio")

# 3. match the script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from marcar_frases import mark, script_words
marked, missing = mark(words, script_words(roteiro))
json.dump(marked, open(os.path.join(out, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
dst = os.path.join(root, "src", "videos", nome, "words.json")
if os.path.isdir(os.path.dirname(dst)): shutil.copy(os.path.join(out, "words.json"), dst)
lines = max(x["s"] for x in marked) + 1
for s in range(lines):
    ws = [x for x in marked if x["s"] == s]
    print(f"linha {s:2d}  {ws[0]['t0']:6.2f}-{ws[-1]['t1']:6.2f}s  {' '.join(x['w'] for x in ws)[:70]}")
if missing:
    print("\nATENÇÃO: estas palavras do roteiro não foram encontradas na gravação (tempo estimado):", ", ".join(missing))
    print("Se você mudou o texto ao gravar, atualize o roteiro e rode de novo.")
print(f"\nwords.json -> {dst}\npróximo: node scripts/timing-json.mjs src/videos/{nome} out/{nome}/timing.json")
