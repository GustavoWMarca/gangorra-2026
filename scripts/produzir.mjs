// Produz um desenho do começo ao fim, em ordem, parando no primeiro erro:
//   1 tsc  2 tempos (timing.json)  3 verificador (0 erro)  4 som  5 folha de fotos  6 render POR CENA (só as que mudaram)
//   7 junta as cenas + som  8 legendas (se houver a composição)  9 QA (quadro preto, duração)  10 limpa temporários
// uso: node scripts/produzir.mjs <nome> [--2k] [--cenas 4,7] [--tudo] [--sem-fotos] [--sem-legenda] [--sem-som] [--refazer-som]
//   leve (padrão): 720x1280 sem desfoque de lente; --2k: 1440x2560 com tudo.
//   cenas: por padrão re-renderiza só as cenas cujo trecho de quadros ou arquivos-fonte mudaram desde o último render;
//   --cenas força algumas; --tudo força todas.
// convenções: composição <Nome>Short e Legendas<Nome> (src/Root.tsx), src/videos/<nome>/, audio/make_audio_<nome>.py,
// saída em out/<nome>/ (<nome>.mp4 e <nome>-legendado.mp4).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const nome = args[0];
if (!nome || nome.startsWith("--")) { console.log("uso: node scripts/produzir.mjs <nome> [--2k] [--cenas 4,7] [--tudo] [--sem-fotos] [--sem-legenda] [--sem-som]"); process.exit(2); }
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const HI = flag("--2k");
const SCALE = HI ? 4 / 3 : 2 / 3;
const PROPS = HI ? {} : { post: { lens: false } };
const Nome = nome[0].toUpperCase() + nome.slice(1);
const COMP = `${Nome}Short`, LEG = `Legendas${Nome}`;
const ROOT = process.cwd(), DIR = path.join(ROOT, "src/videos", nome), OUT = path.join(ROOT, "out", nome), SEG = path.join(OUT, "cenas");
const TMP = path.join(ROOT, "out/tmp");
fs.mkdirSync(SEG, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
process.env.TEMP = process.env.TMP = TMP;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(0) + " s";
const step = (n, s) => console.log(`\n[${n}] ${s}  (${sec()})`);
// tudo que os programas imprimem vai para out/<nome>/producao.log; na tela só sai o resumo (economiza leitura)
const LOG = path.join(OUT, "producao.log");
fs.writeFileSync(LOG, `produzir ${args.join(" ")}  ${new Date().toISOString()}\n`);
const _log = console.log.bind(console);
console.log = (...a) => { const s = a.join(" "); fs.appendFileSync(LOG, s + "\n"); _log(s); };
const toLog = (s) => fs.appendFileSync(LOG, s);
/** roda um programa com a saída só no log; `show` filtra as linhas que vão para a tela; se falhar, mostra o fim do log dele */
const run = (cmd, a, show = () => false) => {
  const r = spawnSync(cmd, a, { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 1 << 28 });
  const out = (r.stdout ?? "") + (r.stderr ?? "");
  toLog(`\n$ ${cmd} ${a.join(" ")}\n${out}`);
  for (const l of out.split(/\r?\n/)) if (l.trim() && show(l)) _log("   " + l.trim());
  if (r.status !== 0) { _log(out.split(/\r?\n/).filter((l) => l.trim()).slice(-15).map((l) => "   | " + l).join("\n")); _log(`\nPAROU: ${cmd} ${a.join(" ")} falhou (log completo: ${LOG})`); process.exit(1); }
};
const ff = (a) => run("ffmpeg", ["-y", "-loglevel", "error", ...a]);

// 1-3 -------------------------------------------------------------------------------------------------------------
step(1, "conferindo tipos (tsc)"); run("npx", ["tsc", "--noEmit", "-p", "."]);
step(2, "tempos da narração -> timing.json"); run("node", ["scripts/timing-json.mjs", `src/videos/${nome}`, `out/${nome}/timing.json`], (l) => /^timing:/.test(l));
step(3, "verificador de enquadramento (precisa de 0 erro)"); run("node", ["scripts/preflight.mjs", `src/videos/${nome}`, "1"], (l) => /^ERRO|erro\(s\)/.test(l));
const TM = JSON.parse(fs.readFileSync(path.join(OUT, "timing.json"), "utf8"));

// 4 ---------------------------------------------------------------------------------------------------------------
const audioPy = path.join(ROOT, "audio", `make_audio_${nome}.py`);
const audioKey = fs.existsSync(audioPy) ? crypto.createHash("sha1").update(fs.readFileSync(audioPy)).update(fs.readFileSync(path.join(OUT, "timing.json"))).update(fs.existsSync(path.join(OUT, "words.json")) ? fs.readFileSync(path.join(OUT, "words.json")) : "").update(fs.existsSync(path.join(OUT, "voice.wav")) ? String(fs.statSync(path.join(OUT, "voice.wav")).size) : "").digest("hex") : "";
const audioKeyFile = path.join(OUT, "mix.key");
const audioFresh = fs.existsSync(path.join(OUT, "mix.wav")) && fs.existsSync(audioKeyFile) && fs.readFileSync(audioKeyFile, "utf8") === audioKey;
if (!flag("--sem-som") && fs.existsSync(audioPy) && (!audioFresh || flag("--refazer-som"))) { step(4, "som (trilha + efeitos + mix)"); run("py", [audioPy, `out/${nome}`]); fs.writeFileSync(audioKeyFile, audioKey); }
else if (audioFresh) step(4, "som: narração, tempos e script iguais ao último -> mix.wav reaproveitado");
else step(4, fs.existsSync(path.join(OUT, "mix.wav")) ? "som: usando o mix.wav que já existe" : "som: SEM mix.wav (o vídeo sai mudo)");

// browser + bundle once for everything below ------------------------------------------------------------------------
const { bundle } = await import("@remotion/bundler");
const { openBrowser, selectComposition, renderMedia, renderStill } = await import("@remotion/renderer");
const chromiumOptions = { gl: "angle" };
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });
const browser = await openBrowser("chrome", { browserExecutable: CHROME, chromiumOptions });
const comp = await selectComposition({ serveUrl, id: COMP, inputProps: PROPS, puppeteerInstance: browser, browserExecutable: CHROME, chromiumOptions, logLevel: "error" });
const onBrowserLog = (l) => { if (l.type === "error") toLog(`[navegador] ${l.text}\n`); };
const quiet = { logLevel: "error" };

// 5 ---------------------------------------------------------------------------------------------------------------
if (!flag("--sem-fotos")) {
  step(5, "folha de fotos: começo, meio e fim de cada cena -> folha.jpg");
  const frames = TM.SHOTS.flatMap((s) => [s.a + 3, Math.round((s.a + s.b) / 2), s.b - 4]);
  const files = [];
  for (const f of frames) {
    const out = path.join(TMP, `folha_${f}.jpg`);
    await renderStill({ composition: comp, serveUrl, frame: f, output: out, imageFormat: "jpeg", jpegQuality: 80, scale: 0.25,
      inputProps: PROPS, puppeteerInstance: browser, browserExecutable: CHROME, chromiumOptions, onBrowserLog, ...quiet });
    files.push(out);
  }
  const cols = 3, n = files.length, fc = files.map((_, i) => `[${i}]scale=180:320[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${n}:grid=${cols}x${n / cols}`;
  ff([...files.flatMap((f) => ["-i", f]), "-filter_complex", fc, path.join(OUT, "folha.jpg")]);
  console.log("   folha:", path.join(OUT, "folha.jpg"), `(${n} fotos; linhas = cenas)`);
}

// 6 ---------------------------------------------------------------------------------------------------------------
step(6, "render por cena");
const srcHash = (() => { // every source the picture depends on (the video folder + shared code), not the audio
  const h = crypto.createHash("sha1");
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|tsx|json)$/.test(e.name) && !/^Legendas/.test(e.name)) h.update(p).update(fs.readFileSync(p)); } };
  walk(DIR); for (const d of ["src/kit"]) if (fs.existsSync(d)) walk(path.join(ROOT, d));
  return h.digest("hex");
})();
const manPath = path.join(SEG, "manifest.json");
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, "utf8")) : {};
const force = new Set((opt("--cenas") ?? "").split(",").filter(Boolean).map(Number));
const want = TM.SHOTS.map((s) => ({ ...s, key: `${s.a}-${s.b}|${SCALE}|${JSON.stringify(PROPS)}`, file: path.join(SEG, `cena${String(s.id).padStart(2, "0")}.mp4`) }));
for (const s of want) {
  const old = man[s.id], fresh = old && old.key === s.key && old.src === srcHash && fs.existsSync(s.file);
  if (fresh && !flag("--tudo") && !force.has(s.id)) { console.log(`   cena ${s.id}: igual ao último render, reaproveitada`); continue; }
  const why = !old ? "nova" : force.has(s.id) || flag("--tudo") ? "pedida" : old.key !== s.key ? "trecho mudou" : "código mudou";
  const ts = Date.now();
  await renderMedia({ composition: comp, serveUrl, codec: "h264", crf: 18, outputLocation: s.file, frameRange: [s.a, s.b - 1], scale: SCALE,
    inputProps: PROPS, muted: true, concurrency: 2, puppeteerInstance: browser, browserExecutable: CHROME, chromiumOptions, onBrowserLog, ...quiet });
  man[s.id] = { key: s.key, src: srcHash }; fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
  console.log(`   cena ${s.id} (${why}): quadros ${s.a}-${s.b - 1} em ${((Date.now() - ts) / 1000).toFixed(0)} s`);
}

// 7 ---------------------------------------------------------------------------------------------------------------
step(7, "juntando as cenas + som");
const list = path.join(SEG, "lista.txt");
fs.writeFileSync(list, want.map((s) => `file '${s.file.replace(/\\/g, "/")}'`).join("\n"));
const video = path.join(OUT, "video.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-an", "-c", "copy", video]);
const mix = path.join(OUT, "mix.wav"), final = path.join(OUT, `${nome}.mp4`);
ff(["-i", video, ...(fs.existsSync(mix) ? ["-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
  "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-movflags", "+faststart", final]);

// 8 ---------------------------------------------------------------------------------------------------------------
let legendado = null;
const hasLeg = fs.readFileSync(path.join(ROOT, "src/Root.tsx"), "utf8").includes(`id="${LEG}"`);
if (hasLeg && !flag("--sem-legenda")) {
  step(8, "legendas animadas (só a camada, transparente)");
  const legComp = await selectComposition({ serveUrl, id: LEG, puppeteerInstance: browser, browserExecutable: CHROME, chromiumOptions });
  const mov = path.join(OUT, "legendas.mov"), legKeyFile = path.join(OUT, "legendas.key");
  const legKey = crypto.createHash("sha1").update(fs.readFileSync(path.join(DIR, `Legendas${Nome}.tsx`))).update(fs.readFileSync(path.join(DIR, "words.json")))
    .update(fs.readFileSync(path.join(ROOT, "src/legendas/Legendas.tsx"))).update(JSON.stringify(TM.SHOTS)).update(String(SCALE)).digest("hex");
  if (fs.existsSync(mov) && fs.existsSync(legKeyFile) && fs.readFileSync(legKeyFile, "utf8") === legKey) console.log("   legendas iguais ao último render, reaproveitadas");
  else { await renderMedia({ composition: legComp, serveUrl, codec: "prores", proResProfile: "4444", imageFormat: "png", pixelFormat: "yuva444p10le",
    outputLocation: mov, scale: SCALE, concurrency: 4, puppeteerInstance: browser, browserExecutable: CHROME, chromiumOptions, muted: true, ...quiet }); fs.writeFileSync(legKeyFile, legKey); }
  legendado = path.join(OUT, `${nome}-legendado.mp4`);
  ff(["-i", final, "-i", mov, "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]", "-map", "[v]", "-map", "0:a?",
    "-c:v", "libx264", "-crf", "22", "-preset", "slow", "-c:a", "copy", "-movflags", "+faststart", legendado]);
} else step(8, hasLeg ? "legendas: puladas (--sem-legenda)" : `legendas: não há composição ${LEG}`);
await browser.close({ silent: true });

// 9 ---------------------------------------------------------------------------------------------------------------
step(9, "QA quadro a quadro");
let bad = 0;
for (const f of [final, legendado].filter(Boolean)) {
  const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,duration", "-of", "csv=p=0", f]).toString().trim().split(/\r?\n/);
  const r = spawnSync("ffmpeg", ["-i", f, "-vf", "blackframe=amount=98:threshold=24", "-an", "-f", "null", "-"], { encoding: "utf8" });
  const blacks = (r.stderr.match(/Parsed_blackframe.*?frame:(\d+)/g) ?? []).map((m) => m.match(/frame:(\d+)/)[1]);
  const vdur = parseFloat(probe.find((l) => l.startsWith("video"))?.split(",").pop() ?? "0"), adur = parseFloat(probe.find((l) => l.startsWith("audio"))?.split(",").pop() ?? "0");
  const okDur = Math.abs(vdur - TM.TOTAL / TM.FPS) < 0.1 && (!adur || Math.abs(adur - vdur) < 0.1);
  console.log(`   ${path.basename(f)}: ${probe.join(" | ")}  ${(fs.statSync(f).size / 1048576).toFixed(1)} MB  quadros pretos: ${blacks.length ? blacks.join(",") : 0}  duração ${okDur ? "ok" : "ERRADA"}`);
  if (blacks.length || !okDur) bad++;
}

// 10 --------------------------------------------------------------------------------------------------------------
step(10, "limpando temporários do render");
for (const e of fs.readdirSync(TMP)) if (/^(remotion-|react-motion-|puppeteer_dev|folha_)/.test(e)) fs.rmSync(path.join(TMP, e), { recursive: true, force: true });
console.log(`\n${bad ? "TERMINOU COM PROBLEMA NO QA" : "PRONTO"} em ${sec()}: ${final}${legendado ? `\n                  ${legendado}` : ""}\nlog completo: ${LOG}`);
process.exit(bad ? 1 : 0);
