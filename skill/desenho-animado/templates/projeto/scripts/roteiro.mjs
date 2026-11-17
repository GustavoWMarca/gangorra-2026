// O roteiro é a fonte única: roteiros/<nome>.md, seção "## Narração" (uma linha = um trecho; **negrito** = ênfase;
// "…" = pausa). Daqui saem:
//   audio/narracao_<nome>.txt  texto limpo (voz sintética, alinhamento da gravação, legendas via words.json)
//   out/<nome>/GRAVAR.md        guia de gravação com o roteiro marcado
// uso: node scripts/roteiro.mjs <nome>
import fs from "node:fs";
import path from "node:path";

const nome = process.argv[2];
const ROOT = process.cwd(), src = path.join(ROOT, "roteiros", `${nome}.md`);
if (!fs.existsSync(src)) { console.log(`não achei roteiros/${nome}.md (crie com npm run novo -- ${nome})`); process.exit(1); }
const md = fs.readFileSync(src, "utf8");
const title = (md.match(/^#\s+(.+)$/m) ?? [, nome])[1].trim();
const sec = md.split(/^##\s+Narração\s*$/m)[1];
if (!sec) { console.log('o roteiro precisa de uma seção "## Narração"'); process.exit(1); }
const lines = sec.split(/^##\s/m)[0].replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const plain = lines.map((l) => l.replace(/\*\*/g, "").replace(/…/g, ",").replace(/\s+,/g, ",").replace(/,{2,}/g, ","));
fs.writeFileSync(path.join(ROOT, "audio", `narracao_${nome}.txt`), plain.join("\n") + "\n");
const out = path.join(ROOT, "out", nome); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "GRAVAR.md"), `# Como gravar: ${title}

- Lugar pequeno e com coisas macias (quarto). Celular a um palmo da boca, um pouco de lado. Modo avião.
- Gravador de voz do celular ou áudio de WhatsApp. Grave tudo de uma vez; errou, pare 1 s e repita só a frase.
- **Energia de quem conta uma fofoca boa**, não de quem lê. Rápido, sem respirar fundo entre as frases.
- Fale mais forte as palavras em **negrito**; faça uma pausa curta onde tem \`…\`.
- A primeira frase é a mais importante: é ela que segura quem está rolando o feed.

## Roteiro

${lines.join("\n\n")}
`);
const words = plain.join(" ").split(/\s+/).length;
console.log(`roteiro: ${lines.length} linhas, ${words} palavras (~${(words / 3.7).toFixed(0)} s falando rápido)`);
console.log(`-> audio/narracao_${nome}.txt  e  out/${nome}/GRAVAR.md`);
