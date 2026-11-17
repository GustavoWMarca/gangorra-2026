---
name: desenho-animado
description: 'Faz um short vertical (~15-70 s) em desenho animado "bonecos 2D num mundo 3D colorido" contando uma história real pesquisada, com narração (voz do usuário ou provisória), trilha, efeitos e legendas opcionais, via three.js + Remotion com um kit pronto de cenários/bonecos e os comandos npm run novo / voz / produzir. Use quando pedirem "faz um desenho animado contando a história de…", "um short animado nesse estilo", "/desenho-animado <tema>", ou para mexer nos vídeos já feitos (eleições, apagão). PRIMEIRO passo sempre: usar o projeto existente em C:\Users\Usuario\Documents\Codex\2026-11-10\ex\outputs\visualizador\desenho-eleicoes-2026 e seguir a seção "Fluxo rápido".'
---

# Desenho animado 2D/3D (three.js + Remotion)

## COMECE AQUI
1. **Projeto já existe** (não crie outro, não copie pisa/bridge):
   `C:\Users\Usuario\Documents\Codex\2026-11-10\ex\outputs\visualizador\desenho-eleicoes-2026`
   (repo privado GustavoWMarca/gangorra-2026; vídeos feitos: `eleicoes`, `apagao`). Abra o terminal nessa pasta.
2. Siga a seção **"Fluxo rápido"** abaixo: pesquisa e roteiro em `roteiros/<nome>.md` → `npm run novo` →
   `npm run voz` → editar story/cast/world com o kit → `npm run produzir`. O resto deste arquivo é referência.
3. Padrões deste usuário: render leve 720x1280 (PC sem placa de vídeo); narração com a VOZ DELE (mande
   `out/<nome>/GRAVAR.md`; voz sintética só provisória); legenda só se pedir (embaixo, 79 % da altura);
   verificador com 0 erro antes de renderizar; uma conversa por vídeo.

Exemplos antigos (referência visual, sem o kit):
- **A Torre de Pisa** (`templates/pisa/`, composição `PisaShort`, 1080x1920, 30 fps): 12,6 s na voz do narrador, 6 cenas.
- **A ponte** (`templates/bridge/`, composição `BridgeShort`): 67 s, o primeiro exemplo do estilo.
- Estudo do estilo: `references/` (STYLE_BIBLE.md, reports/*.md, frames/, sheets/).

As referências são material de estudo.
- Nunca publique nem envie os vídeos de referência.
- Nunca copie roteiro, bonecos ou cenas deles. História, bonecos e voz são sempre do usuário.
- Nunca diga o nome do canal de referência na narração ou na descrição.

Regras padrão (o usuário pode mudar):
- Sem legenda nem etiqueta dentro do desenho (legenda animada só se pedirem: passo 12).
- Português do Brasil.
- Voz num tom só, firme e rápida.
- Piadas são fatos reais pesquisados.
- Mixagem: música +3 dB, efeitos -6 dB, voz intocada.
- Final vertical 2K: 1440x2560 (`--scale 1.3333333333333333`); leve: 720x1280 em PC sem placa de vídeo (passo 11).
- Salvar depois de cada etapa.

## Fluxo rápido (USE ISTO) — menos processamento e menos tokens
Projeto pronto em `templates/projeto/`: kit (`src/kit/`), legendas (`src/legendas/`), modelo de vídeo (`modelos/`),
comandos (`scripts/`) e ferramentas de voz/som (`audio/`). Um vídeo inteiro usando o kit: `templates/exemplos/apagao/`.
1. `npm run novo -- <nome> "<Título>"` cria `src/videos/<nome>/` (story, timing, world, cast, componente, legendas),
   `roteiros/<nome>.md` e `audio/make_audio_<nome>.py`, e registra `<Nome>Short` + `Legendas<Nome>` no Root.
2. Escreva SÓ `roteiros/<nome>.md` (fonte única: fontes, fatos, seção `## Narração` com uma linha por trecho,
   **negrito** = ênfase, `…` = pausa). Dele saem a narração, o guia de gravação (`out/<nome>/GRAVAR.md`) e as legendas.
3. `npm run voz -- <nome>` (voz provisória) ou `npm run voz -- <nome> <gravação do usuário>` → `words.json` marcado.
4. Edite o mínimo: `story.ts` (`SHOT_LINES`, `T_* = tw(linha, "palavra")`, `CAMS`, `CHECKS`), `cast.ts` (quem está em
   cena com `crowd/stander/FAMILY/bubbleFx/burst/confetti/rings/kitItem`), `world.ts` (peças de `kit/sets.ts` e
   `kit/props.ts`: praça, casario com janelas que apagam, morros, árvores, TV, mesa, torres, gangorra, urna). Precisa de
   peça nova? Faça no kit (`src/kit/`), não no vídeo, e copie de volta para a skill.
5. `npm run produzir -- <nome>`: tsc → tempos → verificador (para no 1º erro) → som (pula se nada mudou) → folha de
   fotos (`out/<nome>/folha.jpg`, 3 por cena, olhe UMA imagem) → render POR CENA (só as que mudaram) → junta + som →
   legendas (pula se iguais) → QA quadro a quadro → limpa temporários. Leve por padrão (720x1280); `--2k` para
   1440x2560; `--cenas 4,7` refaz só essas (~2,5 min em vez de ~14); `--tudo`; `--sem-fotos`; `--refazer-som`.
   A tela mostra só um resumo de ~20 linhas; o log completo fica em `out/<nome>/producao.log` (leia só se PAROU).
6. Regras de economia: uma conversa por vídeo (contexto longo custa caro a cada mensagem); peça ao usuário tudo de
   uma vez (tema, voz, legenda, resolução); não leia logs inteiros nem várias fotos soltas; partes mecânicas (rodar
   comandos, subir pro GitHub) podem ir num modelo mais leve, que o usuário escolhe no app.

## Instalação (primeira vez)
1. Copie esta pasta para `~/.claude/skills/desenho-animado/`.
2. Crie o projeto: copie `templates/projeto/` para uma pasta nova e rode `npm install` (e `py -m pip install numpy
   scipy edge-tts`; para a voz do usuário, `faster-whisper` — o modelo small baixa ~480 MB, peça antes).
3. Confira que o Node, o ffmpeg, o Python e o Google Chrome estão instalados.
4. Os exemplos antigos (`templates/pisa/`, `templates/bridge/`) não usam o kit: servem só de referência visual.
## Passo a passo
1. **Tema e fatos.** Uma história verdadeira e surpreendente, com causa e efeito físicos (precisa ser visual), e uma
   comparação do dia a dia que explique.
   - Escreva os fatos com a fonte no topo de `SCRIPT.md`. Confira cada data e número antes de escrever.
2. **Roteiro** (~3,7 palavras/s). Fórmula das batidas:
   - **Gancho:** o fato absurdo numa frase ("A torre mais famosa da Itália só tá de pé porque uma guerra parou a obra.").
   - **Cenário:** ano, lugar, orgulho.
   - **Ação:** a coisa vai subindo em três ou quatro batidas, cada uma um pouco maior.
   - **O estalo:** o momento em que dá errado.
   - **Linha dupla seca:** "Por sorte… / Por azar…".
   - **Explicação:** uma ideia física através de uma comparação do dia a dia, começando com "Sabe por quê?".
   - **Consequência** e **virada final**.
   - Nunca descreva o que a pessoa já está vendo.
   - Curto também funciona: a Torre de Pisa tem 5 frases e 12,6 s.
3. **Voz.** Tudo é sincronizado no `words.json` (tempo de cada palavra). Roteiro em `audio/narracao_<nome>.txt`, um
   trecho por linha (cada linha costuma virar uma cena).
   - **Voz do usuário (a que mais prende; vozes sintéticas grátis soam "lidas" e o usuário achou falsas):** mande o
     guia `templates/GRAVAR_VOZ_exemplo.md` adaptado ao roteiro (negrito = ênfase, `…` = pausa de suspense). Com o
     arquivo: `py audio/alinhar_voz.py <gravação> audio/narracao_<nome>.txt <nome>` limpa o áudio (ffmpeg), tira os
     tempos com faster-whisper no processador (`pip install faster-whisper`, modelo small ~480 MB — peça antes de
     baixar) e casa com o roteiro (`marcar_frases.py`: avisa palavra pulada/trocada e estima o tempo dela).
   - **Voz sintética:** `py audio/tts.py out/<nome> - audio/narracao_<nome>.txt` (edge-tts pt-BR-AntonioNeural, +24 %)
     e depois `py audio/marcar_frases.py out/<nome>/words.json audio/narracao_<nome>.txt`. Offline neste tipo de PC:
     Piper e Kokoro (`audio/comparar_vozes.py` gera a mesma frase em 9 vozes). Pagas e bem mais naturais: ElevenLabs,
     OpenAI TTS (o usuário cria a conta e põe a chave).
   - **Nada de tempo escrito à mão:** copie `templates/timing.ts` para o vídeo e, no `story.ts`, derive tudo da fala:
     `T_X = tw(linha, "palavra")`, cenas começando 0,15 s antes de `lineStart(linha)`, `TOTAL` = fim da voz + 1,45 s,
     chaves de câmera relativas ao início da cena (`A(id)`). Trocar a voz = gerar outro `words.json` e pronto.
   - O som lê os mesmos tempos: `node scripts/timing-json.mjs src/videos/<nome> out/<nome>/timing.json`.
4. **Plano das cenas** em `story.ts`: copie `templates/pisa/` (ou `templates/bridge/`) para `src/videos/<nome>/`,
   registre a composição nova em `src/Root.tsx` e renomeie.
   - `TOTAL`: duração em quadros. Os tempos das palavras (`T_SINK`, `T_WAR`… na Pisa) ficam no topo.
   - `SHOTS`: id, quadros a/b, luz day/golden, modo da multidão.
   - `XFADE`: fusões nas trocas de lugar/tempo. `FLASH_AT`: um flash branco depois do gancho.
   - `CAMS`: chaves por cena `{f, dur?, cut?, s: f => {pos, look, fov, roll}}`.
   - `KICKS`: tremidas de impacto. `DOF`/`dofAt`: desfoque por batida. `FOREGROUND`: objetos em primeiro plano.
   - Toda reação visual cai 0-3 quadros antes da palavra dela.
5. **Mundo.**
   - `lights.ts`: luzes e paleta do céu/rio/nuvens por luz.
   - `shade.ts`: sombreado em dois tons e `untone()`.
   - `build.ts`: cidade, casas e objetos (kit Kenney CC0 opcional, recolorido), tirando tudo que bloqueia uma câmera.
   - `paint.ts`: texturas pintadas em Canvas2D, com as emendas pintadas como tons escuros.
   - `world.ts`: céu em shader, névoa = cor do horizonte, rio, pose por quadro, sol fixo por cena e relativo à câmera.
     Na Pisa, a torre é feita andar por andar (`FLOOR_H`, `poseTower`): ela afunda, inclina e fica curva (`CURVE`).
6. **Bonecos.**
   - `toon.ts`: a API de desenho `Pen` em Canvas2D, tela 600x1000, sola em y = 975, cabeça de feijão, braços de palito,
     contorno ameixa de espessura variável, biblioteca de rostos.
   - `cast.ts`: cartões virados pra câmera, multidões, cartões de efeito, piscadas, caminhada. Todos na camada `NOINK`.
     Na Pisa: turistas, pedreiros com martelo (assustam na palavra "afundar") e soldados marchando.
   - `cardshade.ts`: os cartões recebem a luz da cena, sem emissão.
7. **Acabamento** (`Pisa.tsx`/`Bridge.tsx` + `ink.ts` + `lensblur.ts` + `grade.ts`).
   - Ordem: contorno → lente pré → lente principal → bloom → tone map NEUTRAL → cor (MSAA 4).
   - Todo parâmetro em pixel escala com a altura de saída / 1920.
   - Use o `EffectComposer` do próprio `postprocessing` montado à mão (veja "Consertos"), nunca o `<EffectComposer>` do
     `@react-three/postprocessing`.
8. **Som** (`templates/audio/`: timeline.py, sfx_gen.py, sfx.py, music.py, instruments.py, dsp.py, mix.py).
   - Tabela de eventos → efeitos sintetizados + trilha original abaixando sob a voz.
   - Saída: mix.wav (48 kHz, duração exata), stems e cues.md.
   - Trave os tempos da imagem antes de fazer o som. Mudou o tempo depois, refaça o som.
9. **Verificador de enquadramento (obrigatório antes de qualquer render).**
   `node scripts/preflight.mjs src/videos/<nome>` (ou `npm run verificar -- src/videos/<nome>`). Não gera imagem, roda
   em segundos: monta a câmera de `camAt` em TODOS os quadros de todas as cenas, pede ao `cast.stage()` todos os bonecos e
   efeitos, projeta na tela e lista, agrupado por cena/objeto com a faixa de quadros:
   - ERRO: efeito (balão, item, cartão) cortado pela borda; boneco/efeito a menos de 1,5 m da lente ou atravessado pela
     câmera (câmera passando por dentro da multidão num deslize); alvo de `story.CHECKS` cortado ou fora do quadro;
     câmera abaixo do chão ou dentro de um `story.SOLIDS`; qualquer `story.xxxAt(cena, tempo)` (luz, inclinação…)
     devolvendo NaN/undefined — isso vira UM quadro preto no render (ex.: índice negativo num array de piscadas).
   - AVISO: boneco grande com cabeça cortada, pé cortado ou mais de 35 % fora na lateral (multidão na borda é normal).
   - Em `story.ts`, exporte `CHECKS` (o que PRECISA aparecer inteiro: mesa, placa, TV, família, a primeira torre que
     cai… `{ name, shots, box: [min, max], from?, to?, tol? }`) e `SOLIDS` (morros, prédios: `{ name, box }`).
   - Só passe para as fotos com **0 erro**. Zoom lento (`dolly` rate) também corta: abaixe o rate ou abra o fov.
   - Ele pegou no vídeo do apagão o que as fotos de teste deixaram passar: câmera atravessando a multidão num deslize,
     a mesa do kit 100 % fora da última cena, um balão que nunca aparecia e a torre que cai primeiro atrás da câmera.
10. **Conferência do visual.** `node scripts/bridge-stills.mjs out/<nome>/x_ 100,400 0.5` (use `COMP=<Composição>`).
   - Tire foto do começo, meio e fim de CADA cena e monte uma folha (ffmpeg `xstack`); depois de qualquer ajuste de
     câmera, tire a foto de novo antes de renderizar — nunca renderize em cima de um ajuste não conferido.
   - Compare lado a lado com os quadros de referência: `python scripts/sbs_sheet.py out.jpg --ours ... --ref ...`.
   - Confira foto por foto: câmera dentro de parede/morro, boneco cortado na borda, boneco sumido, cor errada.
11. **Render final.**
    - `npx remotion render src/index.ts <Comp> out/<nome>/video.mp4 --codec h264 --crf 16 --scale 1.3333333333333333 --gl=angle`
      (escala com a fração EXATA: `1.3333` dá altura 2559,94 e o Remotion recusa).
    - PC sem placa de vídeo dedicada: pergunte antes e renderize leve: `--scale 0.6666666666666666` (720x1280) e
      `--props=<arquivo>` com `{"post":{"lens":false}}` — ~5-8 min em vez de ~1 h. Depois recomprima com crf 24 +
      `-movflags +faststart`.
    - Junte o som com `-map 0:v:0 -map 1:a:0` (o Remotion grava uma faixa de áudio muda).
    - QA: `python scripts/short_qa.py final.mp4 out/<nome>/qa shots.json` procura quadro preto, branco, congelado e pulo,
      além do volume e das folhas. Sem Python/numpy, confira QUADRO A QUADRO (o `blackdetect=d=0.2` não vê 1 quadro
      preto): `ffmpeg -i video.mp4 -vf blackframe=amount=98:threshold=24 -an -f null -` não pode listar nada.
12. **Legendas animadas (só se o usuário pedir; o padrão é sem legenda).** Estilo Shorts: blocos de 2-3 palavras,
    letra grossa branca com contorno preto, palavra falada em amarelo com "pop".
    - Posição: EMBAIXO, ~79 % da altura (no chão/pernas, acima do título e dos botões do Shorts, que ocupam ~12 % de
      baixo). No meio da tela ela tapa o desenho (o usuário reclamou). Em cena com rostos na parte de baixo (close de
      multidão), suba pro céu, ~12 %. Letra 92 px a 1080 de largura.
    - Copie `templates/legendas/Legendas.tsx` para `src/legendas/` e faça um `Legendas<Nome>.tsx` como
      `templates/legendas/LegendasExemplo.tsx`: importa o `words.json` (ative `resolveJsonModule`), troca números falados
      por extenso por algarismos (`["dois mil e vinte e seis", "2026"]`) e define a altura por cena (`yAt`) longe de
      rostos, TV e balões.
    - Registre como composição própria e renderize SÓ a camada, transparente (não refaz o 3D, ~3-4 min):
      `--codec prores --prores-profile 4444 --image-format png --pixel-format yuva444p10le` com a mesma escala do vídeo.
    - Cole no vídeo pronto: `ffmpeg -i video.mp4 -i legendas.mov -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]" -map "[v]" -map 0:a -c:v libx264 -crf 22 -c:a copy out.mp4`.
    - Entregue as duas versões (com e sem legenda).
13. **Entrega.** Mande o mp4 final e anote o que foi feito.

## Consertos (o que deu errado no vídeo da Torre de Pisa e como resolver)
- **Vídeo todo em branco, só o céu.** Com React 19 + @react-three/fiber 9, o `<EffectComposer>` do
  `@react-three/postprocessing` 3.x não desenha nada. Diagnóstico: um cubo vermelho sem efeitos aparece, e a cidade
  aparece com `--props='{"nopost":true}'`. Conserto (já em `templates/pisa/Pisa.tsx` e `templates/bridge/Bridge.tsx`):
  montar o composer à mão com `new EffectComposer(gl, { multisampling: 4, frameBufferType: HalfFloatType })`,
  `RenderPass` + passes de contorno/lente/bloom/cor, e renderizar em `useFrame(..., 1)`. Também `alpha: false` no `gl`
  do ThreeCanvas.
- **Os bonecos sumiram.** Andar com a câmera em direção a um ponto distante faz ela passar dos bonecos da frente. Nas
  esperas, use zoom de lente (mexer no fov) em vez de andar com a câmera (`dolly()` em story.ts da Pisa) e deixe a câmera
  e a multidão mais para trás.
- **A torre não parecia torta.** A inclinação real (~4°) some no vídeo. Exagere de propósito, como desenho animado faz
  (4,8° no toco, 7° pronta).
- **Pé cortado embaixo.** Abaixe o ponto que a câmera olha (`look` y) até os pés entrarem no quadro.
- **Downloads bloqueados do kit Kenney.** O carregamento é opcional: sem ele, faça árvores simples em código.
- **Mac:** renderize com `TMPDIR=<pasta com espaço>`, o Chrome do sistema (`--browser-executable`) e `--gl=angle`.

## Valores do visual (todos em `templates/`)
Comece todo desenho novo de `templates/pisa/` ou `templates/bridge/`: o visual mora nestes valores e a história mora em
story.ts, no layout do build.ts/world.ts e nos papéis do cast.ts.
- **Luzes** (`lights.ts`, sol relativo à câmera e fixo por cena):
  - dia: az 75 / el 48, luz [1.58,1.5,1.33], sombra [.30,.29,.36], lift [.05,.06,.11] (tom frio SÓ na sombra), céu
    #3e7fd2 no alto → #b8d0ec no horizonte, névoa = horizonte, 25→300 m, uSat 1.08, ~15 % de névoa azul depois de 60 m.
  - golden: az 6 / el 7 (sol baixo de contraluz), luz pra #FFB36B ×1.5, sombra azul-violeta (fachada ≈ #444380), céu
    #ffc47c → #8a6f8a, névoa pêssego só depois de 50 m, disco do sol #ffcf9e + bloom.
- **Cores dos materiais** (`paint.ts`/`build.ts`): casas tijolo/creme/ocre/terracota apagados com rodapé, cornija,
  peitoris, chaminé; alturas 7 / 8,4 / 9,8 m; pedra cinza/bege quente (saturação −35 %); madeira ocre com emendas quase
  pretas; ferro escuro e dessaturado. Nunca amarelo-limão, nunca rosto lilás.
- **Contorno** (`ink.ts`): #030303, 5,1 px perto (6 m) → 3,3 px longe (90 m) em 1080x1920, dobras ×0,8 a partir de 35°,
  saltos de profundidade a partir de 1 %; os bonecos ficam na camada `NOINK` (têm o próprio contorno ameixa).
- **Lente** (`lensblur.ts` + `dofAt`): cInf em px a 1080: closes 12-16, planos médios 10-12, parque 7, golden 5,
  abertos/aéreos 0. Foco nos olhos da fileira da frente.
- **Acabamento:** bloom (thr 1.0, int .5, 6 níveis, raio .6) → tone map NEUTRAL → cor; MSAA 4. Granulação desligada.
- **Bonecos:** cabeça h/w .94, contorno ameixa #241726, olhos .26 W de distância, sem blush, 14 expressões; adultos com
  3,5 cabeças de altura; balanço da caminhada 5 %, inclinação 1-7°, passo de 0,8 m; piscadas a cada 0,5-2,3 s; sombra de
  contato ~.5 sob os pés.
- **Câmera:** corta nos saltos grandes, desliza 18-40 quadros (smootherstep), toda espera avança devagar (nenhuma parada
  ≥ 4 quadros), tremida que troca de lado a cada quadro e some em 7 quadros nos impactos, rolagens de 4-4,6°.

## Metas medidas na referência (detalhes em references/reports/)
- **Contorno:** ~3 px a 1080 de largura, quase preto #0b0a0c, quase constante com a distância. Só silhuetas, saltos de
  profundidade e dobras. Bonecos nunca recebem o contorno do mundo; o deles é ameixa #201628-#2f1d28.
- **Cor:** luminância mediana de dia ~.57, sem pretos esmagados (p5 ~.23), croma C* p90 ~55, céu #5e93d9.
  Golden: horizonte pêssego #ffd08a, sombras azul-violeta (nunca marrom), sol de contraluz.
- **Profundidade:** desfoque em ~1/3 do tempo (closes e planos médios), névoa = cor do horizonte, bloom só em emissivos.
- **Câmera:** cortes secos só nos saltos grandes; toda espera avança 0,15-0,35 %/quadro; sem câmera na mão.
- **Bonecos:** ~3,5 cabeças de altura, pernas 1,4 cabeça, braços finos, cabeça de feijão, rostos com brilho ~.93.

## Igualar o visual a uma referência (como chegar no "parece igual")
1. **Meça a referência primeiro.** Um relatório por tema (movimento, profundidade, textura, bonecos, luz, contorno, cor),
   com números e não adjetivos, em `references/reports/<tema>.md`.
2. **Uma cópia por dono.** Cada agente cuida dos próprios arquivos numa cópia do projeto (câmera: story.ts; mundo:
   world.ts/lights.ts/shade.ts/grade.ts; materiais: paint.ts/build.ts; bonecos: toon.ts/cast.ts/cardshade.ts; acabamento:
   ink.ts/Pisa.tsx/lensblur.ts). Quando usar vários agentes, divida os arquivos, não só as tarefas.
3. **Junte** com `python scripts/bridge_merge.py`, rode `npx tsc --noEmit` e sincronize todas as cópias.
4. **Confira** com um agente novo: folhas lado a lado, nota de 0 a 10 por área e uma lista numerada de correções.

## Armadilhas
- Materiais do kit Kenney vêm verde-azulados: recolora pelo nome do material.
- Câmera dentro de casa: o filtro de linha de visão remove o que bloqueia a câmera.
- Contorno na mesma passada do desfoque é apagado: o contorno é uma passada própria, antes do desfoque.
- Parâmetros em pixel escalam com a resolução (fotos a 0,5, final a 1,333).
- **Disco:** cada render copia `public/` para a pasta temporária e não apaga. Use `TMPDIR`/`REMOTION_TMP` numa pasta com
  espaço e apague as pastas `remotion-webpack-bundle-*` antigas quando nada estiver renderizando.
- O Remotion grava áudio mudo: junte com `-map 0:v:0 -map 1:a:0`.
- Arquivos `.ts` de rascunho dentro de `out/` quebram o `tsc`: use `.txt`.
- Granulação deixa o arquivo 4x maior e vira borrão no YouTube. Deixe desligada.
- Balanço desenhado com uma corda só parece enforcamento: sempre duas cordas.
- Objeto a menos de ~2 m da lente vira mancha gigante cortada na borda.
- Placa pintada com sol de lado fica cinza e ilegível: use material sem luz na face da placa.
- Espera parada lê como congelada: toda espera precisa de um zoom lento.

- Editar arquivo pelo PowerShell 5.1 com `Set-Content -Encoding utf8` grava BOM: no `package.json` isso quebra o Remotion (`Unexpected token`). Use `[IO.File]::WriteAllText` com UTF8 sem BOM.
