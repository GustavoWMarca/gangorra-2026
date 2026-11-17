# Desenhos animados (three.js + Remotion)

Shorts verticais no estilo "bonecos 2D num mundo 3D", com narração, trilha e efeitos feitos por código.

| Vídeo | Arquivo | Roteiro e fontes |
|---|---|---|
| A gangorra de 2026 (eleições) | [`out/eleicoes/gangorra-2026.mp4`](out/eleicoes/gangorra-2026.mp4) | [`roteiros/eleicoes.md`](roteiros/eleicoes.md) |
| O apagão do dia 17 | [`out/apagao/apagao.mp4`](out/apagao/apagao.mp4) · [com legenda](out/apagao/apagao-legendado.mp4) | [`roteiros/apagao.md`](roteiros/apagao.md) |

## Fluxo
```
npm install
npm run novo -- <nome> "<Título>"     # cria o vídeo a partir do modelo (src/kit + modelos/)
# escreva roteiros/<nome>.md (seção "## Narração")
npm run voz -- <nome> [gravação]      # voz provisória ou a sua gravação -> tempos de cada palavra
npm run produzir -- <nome>            # verificador, som, fotos, render por cena, legendas, QA
```
Python: `py -m pip install numpy scipy edge-tts` (e `faster-whisper` para alinhar gravações).