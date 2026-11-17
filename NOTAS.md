# A gangorra de 2026 — notas de produção

- Composição: `EleicoesShort` (src/videos/eleicoes), 1160 quadros a 30 fps (38,7 s), final 1440x2560.
- Roteiro e fontes: `SCRIPT.md`.
- Voz: edge-tts `pt-BR-AntonioNeural`, +24 % de velocidade (`audio/tts.py`) → `out/eleicoes/voice.wav` + `words.json`.
- Som: `audio/make_audio.py` (trilha original 120 bpm, efeitos sintetizados, música abaixa 3 dB sob a voz; música +3 dB,
  efeitos -6 dB) → `music.wav`, `sfx.wav`, `mix.wav`, `cues.md`.
- Mundo: praça com casario, palmeiras, urna eletrônica gigante e uma gangorra (lado azul à direita da tela = Flávio,
  lado vermelho à esquerda da tela = Lula). Os 11 cinzentos no meio são os eleitores dos outros 11 candidatos.
- Fotos de conferência: `out/eleicoes/sheet*.jpg`.

Refazer:
```
py audio/tts.py out/eleicoes
py audio/make_audio.py out/eleicoes
npx remotion render src/index.ts EleicoesShort out/eleicoes/video.mp4 --codec h264 --crf 16 --scale 1.3333 --gl=angle
ffmpeg -i out/eleicoes/video.mp4 -i out/eleicoes/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest out/eleicoes/gangorra-2026.mp4
```
