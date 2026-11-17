# A gangorra de 2026

Short animado (38,7 s, vertical) contando as eleições presidenciais de 2026 no Brasil, no estilo "bonecos 2D num
mundo 3D", feito com three.js + Remotion. Uma gangorra gigante numa praça: no 1º turno pende pro Flávio Bolsonaro,
no 2º os eleitores dos outros 11 candidatos escolhem um lado e ela vira pro Lula.

- Vídeo final: [`out/eleicoes/gangorra-2026.mp4`](out/eleicoes/gangorra-2026.mp4) (720x1280)
- Roteiro, fatos e fontes: [`SCRIPT.md`](SCRIPT.md)
- Como refazer: [`NOTAS.md`](NOTAS.md)

## Rodar
```
npm install
npx remotion studio src/index.ts
```
Áudio (Python 3 + `numpy scipy edge-tts`): `py audio/tts.py out/eleicoes` e `py audio/make_audio.py out/eleicoes`.
