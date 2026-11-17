# Rodar o fluxo dos desenhos animados em outra máquina (Windows)

## 1. Pré-requisito
- **Claude Code** instalado (app desktop da Claude com a aba **Code**, ou o `claude` no terminal), logado na sua conta.
- **winget** (já vem no Windows 10/11 atualizado). Placa de vídeo não é necessária: o render leve sai em 720x1280.

## 2. Baixar o projeto
Abra o PowerShell na pasta onde quer guardar e rode (o Git é instalado no passo 3 se faltar; se ainda não tiver Git,
baixe o ZIP pelo site do GitHub: **Code → Download ZIP**, e extraia):
```
git clone https://github.com/GustavoWMarca/gangorra-2026.git
cd gangorra-2026
```
O repositório é privado: o Git vai pedir login no GitHub (janela do navegador).

## 3. Instalar tudo de uma vez
Dentro da pasta do projeto:
```
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
```
Ele instala o que faltar (Git, GitHub CLI, Node.js, ffmpeg, Python, Google Chrome), roda `npm install`, instala os
pacotes de som e voz do Python, copia a skill `desenho-animado` para `%USERPROFILE%\.claude\skills\` já apontando
para esta pasta, e no fim testa os tipos e o verificador do vídeo do apagão.
- Só conferir, sem instalar nada: acrescente `-SoChecar`.
- Para alinhar a gravação da sua voz: acrescente `-Whisper` (o modelo baixa ~480 MB no primeiro uso).
- Se algum programa acabou de ser instalado e o comando seguinte não o encontra, feche e abra o PowerShell e rode de novo.

## 4. Uma vez só
```
gh auth login
```
(para poder subir vídeos e mudanças para o GitHub).

## 5. Testar
```
npm run produzir -- apagao
```
Renderiza o vídeo do apagão inteiro (~15 min sem placa de vídeo) e confere quadro a quadro. Sai em
`out\apagao\apagao.mp4` e `out\apagao\apagao-legendado.mp4`.

## 6. Usar
Abra uma conversa nova no Claude Code **nesta pasta** e peça, de preferência tudo de uma vez:
```
/desenho-animado <tema>, com a minha voz, com legenda
```
O fluxo por baixo (o Claude roda por você):
| Comando | O que faz |
|---|---|
| `npm run novo -- <nome> "<Título>"` | cria o vídeo a partir do modelo (kit) |
| editar `roteiros\<nome>.md` | fonte única: fontes, fatos e narração (uma linha por trecho) |
| `npm run voz -- <nome>` | voz provisória; com a sua gravação: `npm run voz -- <nome> <arquivo>` |
| `npm run produzir -- <nome>` | verificador, som, fotos, render por cena, legendas, QA |
| `npm run produzir -- <nome> --cenas 4` | refaz só a cena 4 (~2,5 min) |

## O que não vem pelo GitHub
- **Memória do Claude Code** deste PC: as preferências importantes (render leve, sua voz, legenda embaixo, verificador)
  já estão escritas na skill, na seção "COMECE AQUI".
- **Quadros dos vídeos de referência** (`references\frames` e `sheets`): ficam fora de propósito. Os números medidos
  (`references\reports`) vêm na skill e bastam.
- **Modelos de voz offline** (Piper/Kokoro, ~300 MB): não são usados no fluxo; as vozes sintéticas grátis foram
  descartadas em favor da sua voz.
