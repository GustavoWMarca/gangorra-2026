// Narração -> words.json (tempo de cada palavra, marcado com a linha do roteiro) em out/<nome>/ e src/videos/<nome>/.
// uso: node scripts/voz.mjs <nome>               voz sintética provisória (edge-tts Antonio)
//      node scripts/voz.mjs <nome> <gravação>    a gravação do usuário (limpa + faster-whisper + casa com o roteiro)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [nome, rec] = process.argv.slice(2);
const ROOT = process.cwd(), OUT = path.join(ROOT, "out", nome), txt = `audio/narracao_${nome}.txt`;
const run = (cmd, a) => { const r = spawnSync(cmd, a, { stdio: "inherit" }); if (r.status !== 0) process.exit(1); };
fs.mkdirSync(OUT, { recursive: true });
run("node", ["scripts/roteiro.mjs", nome]);
if (rec) {
  run("py", ["audio/alinhar_voz.py", rec, txt, nome]);
} else {
  run("py", ["audio/tts.py", `out/${nome}`, "-", txt]);
  run("ffmpeg", ["-y", "-loglevel", "error", "-i", `out/${nome}/voice.mp3`, "-ar", "48000", "-ac", "1", `out/${nome}/voice.wav`]);
  run("py", ["audio/marcar_frases.py", `out/${nome}/words.json`, txt]);
  fs.copyFileSync(path.join(OUT, "words.json"), path.join(ROOT, "src/videos", nome, "words.json"));
}
console.log(`\nvoz pronta. Ajuste os T_* do story.ts com tw(linha, "palavra") e rode  npm run produzir -- ${nome}`);
