// Verificador de enquadramento ANTES do render (não gera imagem nenhuma, roda em segundos).
// uso: node scripts/preflight.mjs <pasta do vídeo, ex. src/videos/apagao> [passo em quadros=1] [aspecto=9/16]
// Para cada cena, a cada `passo` quadros, monta a câmera de story.camAt, pede ao cast.stage() tudo que tem rosto e
// todos os efeitos, projeta na tela e acusa:
//   ERRO  efeito (balão, item, cartão) cortado pela borda do quadro
//   ERRO  alvo importante de story.CHECKS (mesa, TV, placa...) cortado ou fora do quadro nas cenas dele
//   ERRO  boneco ou efeito a menos de 1,5 m da lente (vira mancha gigante) ou atrás da câmera
//   ERRO  câmera abaixo do chão ou dentro de um sólido de story.SOLIDS
//   ERRO  qualquer função story.xxxAt(cena, tempo) devolvendo NaN/undefined (vira quadro preto no render)
//   AVISO boneco grande (>= 22 % da altura do quadro) com a cabeça cortada em cima, o pé cortado embaixo ou
//         mais de 35 % do corpo cortado na lateral
// Saída: lista agrupada por cena/objeto/problema com a faixa de quadros; código de saída 1 se houver ERRO.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";

const [dirArg, stepArg = "1", aspectArg = "0.5625"] = process.argv.slice(2);
if (!dirArg) { console.log("uso: node scripts/preflight.mjs src/videos/<nome> [passo] [aspecto]"); process.exit(2); }
const dir = path.resolve(dirArg), step = Math.max(1, Number(stepArg)), aspect = Number(aspectArg);
const tmp = path.resolve("out/tmp"); fs.mkdirSync(tmp, { recursive: true });
const outFile = path.join(tmp, "preflight-bundle.cjs");

// the cast module creates one canvas at load time: a tiny DOM stub is enough (nothing is drawn here)
const entry = `
globalThis.document = globalThis.document || { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
export * as story from ${JSON.stringify(path.join(dir, "story.ts").replace(/\\/g, "/"))};
export * as cast from ${JSON.stringify(path.join(dir, "cast.ts").replace(/\\/g, "/"))};
export * as THREE from "three";
`;
await esbuild.build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "cjs", outfile: outFile, logLevel: "error" });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
const { story, cast, THREE } = createRequire(import.meta.url)(outFile);

const SU = 0.00216, HALF_W = 300 * SU, BOT = -25 * SU, TOP = 975 * SU; // character card in metres (see cast.ts BODY)
const cam = new THREE.PerspectiveCamera(40, aspect, 0.2, 1500);
const v = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), fwd = new THREE.Vector3();
const issues = new Map(); // key -> {shot, what, msg, level, frames[]}
/** one entry per shot / object / kind of problem; `val` keeps the worst number (cut %, or the shortest distance) */
const add = (level, shot, what, msg, f, val = null, worst = Math.max) => {
  const k = `${shot}|${what}|${msg}`;
  if (!issues.has(k)) issues.set(k, { level, shot, what, msg, frames: [], val });
  const it = issues.get(k); it.frames.push(f); if (val !== null) it.val = it.val === null ? val : worst(it.val, val);
};
/** project world points; returns screen box in [-1, 1] NDC (y up) and the nearest view depth */
const box = (pts) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, near = Infinity, behind = false, ahead = false;
  for (const p of pts) {
    v.copy(p).applyMatrix4(cam.matrixWorldInverse);
    const d = -v.z; near = Math.min(near, d);
    if (d <= 0.05) { behind = true; continue; }
    ahead = true;
    v.applyMatrix4(cam.projectionMatrix);
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
  }
  return { x0, x1, y0, y1, near, behind, ahead };
};
const inside = (b) => b.x1 > -1 && b.x0 < 1 && b.y1 > -1 && b.y0 < 1;          // any part on screen
const cutFrac = (b) => {                                                        // share of the box outside the frame
  const w = b.x1 - b.x0, h = b.y1 - b.y0; if (!(w > 0 && h > 0)) return 0;
  const iw = Math.max(0, Math.min(1, b.x1) - Math.max(-1, b.x0)), ih = Math.max(0, Math.min(1, b.y1) - Math.max(-1, b.y0));
  return 1 - (iw * ih) / (w * h);
};
const nameOf = (key) => { const s = String(key).split("|"); return s.length > 1 ? s[1] : s[0]; };
const solids = story.SOLIDS ?? [];
const checks = story.CHECKS ?? [];
const sun = new THREE.Vector3(0.5, 0.6, -0.4).normalize();

let frames = 0;
for (const s of story.SHOTS) {
  for (let f = s.a; f < s.b; f += step) {
    frames++;
    const t = f / story.FPS, c = story.camAt(s.id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll ?? 0);
    cam.fov = c.fov; cam.aspect = aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    right.setFromMatrixColumn(cam.matrixWorld, 0); upv.setFromMatrixColumn(cam.matrixWorld, 1); fwd.setFromMatrixColumn(cam.matrixWorld, 2).negate();
    // camera
    if (c.pos[1] < 0.25) add("ERRO", s.id, "câmera", "abaixo do chão", f);
    for (const so of solids) {
      const [a, b] = so.box;
      if (c.pos.every((p, i) => p > a[i] && p < b[i])) add("ERRO", s.id, "câmera", `dentro de ${so.name}`, f);
    }
    // every story function of (shot, time) must give finite numbers (a NaN light or tilt renders a black frame)
    if (![...c.pos, ...c.look, c.fov, c.roll ?? 0].every(Number.isFinite)) add("ERRO", s.id, "câmera", "valor inválido (NaN)", f);
    for (const [name, fn] of Object.entries(story)) {
      if (typeof fn !== "function" || !/At$/.test(name) || fn.length !== 2 || name === "camAt") continue;
      let r; try { r = fn(s.id, t); } catch (e) { add("ERRO", s.id, `story.${name}`, `quebrou: ${e.message}`, f); continue; }
      const nums = typeof r === "number" ? [r] : r && typeof r === "object" ? Object.values(r).flat().filter((x) => typeof x === "number" || x === undefined) : [];
      if (nums.some((x) => !Number.isFinite(x))) add("ERRO", s.id, `story.${name}`, "valor inválido (NaN/undefined) — vira quadro preto", f);
    }
    const st = cast.stage(s.id, t, { pos: cam.position.clone(), right: right.clone(), sun });
    // characters: yaw-only cards facing the camera
    for (const p of st.places) {
      const sc = p.scale ?? 1, who = nameOf(p.key);
      const hx = cam.position.x - p.x, hz = cam.position.z - p.z, hl = Math.hypot(hx, hz) || 1, rx = hz / hl, rz = -hx / hl;
      const pts = [];
      for (const sx of [-1, 1]) for (const yy of [BOT, TOP]) pts.push(new THREE.Vector3(p.x + rx * sx * HALF_W * sc, p.y + yy * sc, p.z + rz * sx * HALF_W * sc));
      const b = box(pts);
      if (b.ahead && b.near < 1.5 && (b.behind || inside(b))) { add("ERRO", s.id, `boneco ${who}`, b.near <= 0.05 ? "atrás/colado na câmera" : "perto demais da lente (m)", f, b.near <= 0.05 ? null : +b.near.toFixed(1), Math.min); continue; }
      if (b.behind || !inside(b)) continue;
      const hgt = (b.y1 - b.y0) / 2;
      if (hgt < 0.22) continue;
      const headCut = b.y1 > 1 + 0.02 * hgt, feetCut = b.y0 < -1;
      const w = b.x1 - b.x0, side = (Math.max(0, b.x1 - 1) + Math.max(0, -1 - b.x0)) / (w || 1);
      if (headCut) add("AVISO", s.id, `boneco ${who}`, "cabeça cortada em cima", f);
      else if (feetCut && hgt < 0.6) add("AVISO", s.id, `boneco ${who}`, "pé cortado embaixo", f);
      if (side > 0.35) add("AVISO", s.id, `boneco ${who}`, "cortado na lateral (%)", f, Math.round(side * 100));
    }
    // effects: billboards (the flat ground blobs are skipped)
    for (const e of st.fx) {
      if (e.flat || String(e.key).startsWith("blob|")) continue;
      const pts = [];
      for (const sx of [-0.5, 0.5]) for (const sy of [-0.5, 0.5]) pts.push(new THREE.Vector3(e.x, e.y, e.z).addScaledVector(right, sx * e.w).addScaledVector(upv, sy * e.h));
      const b = box(pts), what = `efeito ${nameOf(e.key).replace(/\d+(\.\d+)?$/, "")}`;
      if (b.ahead && b.near < 1.5 && (b.behind || inside(b))) { add("ERRO", s.id, what, "perto demais da lente (m)", f, +Math.max(0, b.near).toFixed(1), Math.min); continue; }
      if (b.behind || !inside(b) || e.soft) continue;
      const cf = cutFrac(b);
      if (cf > 0.1 && !/^burst|^ring|^conf/.test(String(e.key))) add("ERRO", s.id, what, "fora do quadro (%)", f, Math.round(cf * 100));
    }
    // important world objects
    for (const ck of checks) {
      if (!ck.shots.includes(s.id)) continue;
      if ((ck.from !== undefined && t < ck.from) || (ck.to !== undefined && t >= ck.to)) continue;
      const [a, bb] = ck.box, pts = [];
      for (const x of [a[0], bb[0]]) for (const y of [a[1], bb[1]]) for (const z of [a[2], bb[2]]) pts.push(new THREE.Vector3(x, y, z));
      const b = box(pts);
      if (b.behind || !inside(b)) { add("ERRO", s.id, ck.name, "fora do quadro", f); continue; }
      const cf = cutFrac(b);
      if (cf > (ck.tol ?? 0.05)) add("ERRO", s.id, ck.name, "cortado (%)", f, Math.round(cf * 100));
    }
  }
}

const ranges = (fs_) => { const out = []; let a = fs_[0], p = fs_[0]; for (const f of fs_.slice(1)) { if (f - p > step) { out.push(a === p ? `${a}` : `${a}-${p}`); a = f; } p = f; } out.push(a === p ? `${a}` : `${a}-${p}`); return out.join(", "); };
const list = [...issues.values()].sort((x, y) => (x.level === y.level ? x.shot - y.shot : x.level === "ERRO" ? -1 : 1));
console.log(`preflight ${path.basename(dir)}: ${frames} quadros conferidos (passo ${step}), ${story.SHOTS.length} cenas`);
if (!list.length) console.log("tudo certo: nada cortado, nada colado na lente");
for (const i of list) console.log(`${i.level.padEnd(5)} cena ${String(i.shot).padStart(2)}  ${i.what}: ${i.msg.replace(/ \((%|m)\)$/, "")}${i.val === null ? "" : i.msg.endsWith("(m)") ? ` (${i.val} m)` : ` (até ${i.val} %)`}  [quadros ${ranges(i.frames)}]`);
const nErr = list.filter((i) => i.level === "ERRO").length;
console.log(`\n${nErr} erro(s), ${list.length - nErr} aviso(s)`);
process.exit(nErr ? 1 : 0);
