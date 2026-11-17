// Cria um vídeo novo a partir do modelo (kit): pasta src/videos/<nome>/, roteiro roteiros/<nome>.md, som
// audio/make_audio_<nome>.py e as composições <Nome>Short + Legendas<Nome> registradas em src/Root.tsx.
// uso: node scripts/novo.mjs <nome> "<Título>"      (nome: só letras minúsculas, ex. "apagao")
// depois: escreva o roteiro -> npm run voz -- <nome> [gravação] -> ajuste story/cast/world -> npm run produzir -- <nome>
import fs from "node:fs";
import path from "node:path";

const [nome, titulo = nome] = process.argv.slice(2);
if (!nome || !/^[a-z][a-z0-9]*$/.test(nome)) { console.log('uso: node scripts/novo.mjs <nome em minúsculas> "<Título>"'); process.exit(2); }
const Nome = nome[0].toUpperCase() + nome.slice(1), NOME = nome.toUpperCase();
const ROOT = process.cwd(), M = path.join(ROOT, "modelos"), DIR = path.join(ROOT, "src/videos", nome);
if (fs.existsSync(DIR)) { console.log(`já existe: src/videos/${nome}`); process.exit(1); }
const fill = (s) => s.replaceAll("__TITULO__", titulo).replaceAll("__NOME__", NOME).replaceAll("__Nome__", Nome).replaceAll("__nome__", nome);
const put = (src, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, fill(fs.readFileSync(src, "utf8"))); console.log("criado:", path.relative(ROOT, dst)); };

for (const f of fs.readdirSync(path.join(M, "video"))) {
  const dst = f === "Video.tsx" ? `${Nome}.tsx` : f === "Legendas.tsx" ? `Legendas${Nome}.tsx` : f;
  put(path.join(M, "video", f), path.join(DIR, dst));
}
// words.json provisório (2 linhas) para compilar já; `npm run voz` troca pelo de verdade
fs.writeFileSync(path.join(DIR, "words.json"), JSON.stringify([
  { w: "início", t0: 0.1, t1: 0.5, s: 0, k: 0 }, { w: "fim", t0: 3.0, t1: 3.4, s: 1, k: 0 }]));
if (!fs.existsSync(path.join(ROOT, "roteiros", `${nome}.md`))) put(path.join(M, "roteiro.md"), path.join(ROOT, "roteiros", `${nome}.md`));
if (!fs.existsSync(path.join(ROOT, "audio", `make_audio_${nome}.py`))) put(path.join(M, "make_audio_modelo.py"), path.join(ROOT, "audio", `make_audio_${nome}.py`));

// register the compositions
const rootTsx = path.join(ROOT, "src/Root.tsx");
let r = fs.readFileSync(rootTsx, "utf8");
const imp = `import { ${Nome}Short, ${NOME}_FRAMES } from "./videos/${nome}/${Nome}";\nimport { Legendas${Nome} } from "./videos/${nome}/Legendas${Nome}";\n`;
const comp = `    <Composition id="${Nome}Short" component={${Nome}Short} durationInFrames={${NOME}_FRAMES} fps={30} width={1080} height={1920} />\n` +
  `    <Composition id="Legendas${Nome}" component={Legendas${Nome}} durationInFrames={${NOME}_FRAMES} fps={30} width={1080} height={1920} />\n`;
r = r.replace(/(export const Root)/, imp + "$1").replace(/(\s*<\/>\s*\);\s*)$/, "\n" + comp.trimEnd() + "$1");
fs.writeFileSync(rootTsx, r);
console.log(`registrado em src/Root.tsx: ${Nome}Short, Legendas${Nome}`);
console.log(`\npróximo: escreva roteiros/${nome}.md (seção "Narração") e rode  npm run voz -- ${nome}`);
