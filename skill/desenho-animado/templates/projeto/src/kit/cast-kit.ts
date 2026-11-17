// KIT: elenco e efeitos prontos. Roupas variadas, uma família de 4, gente parada com humor (calma/nervosa/susto/
// festa/cochicho), multidão espalhada, balões de fala com ícone, explosão, anéis de sirene, confete, itens de kit e
// facho de lanterna. Tudo devolve Place/FxPlace no Stage do cast-core.
import { Pen, fxBurst, Outfit, Expr, FrontOpts, INK } from "./toon";
import { CamInfo, Stage, person, blob, lidAt, q, hh } from "./cast-core";

const D0 = 0;
const SK = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#a8714f"];
const HAIRS = ["#5a3b2a", "#2a201a", "#c9893a", "#4a3020", "#1d1714"];
const TEES = ["#e2453c", "#3f6fb5", "#f3d35a", "#2f8a4f", "#f08a2c", "#7b5ac9", "#5ec8d8", "#c25a7a"];

/** roupa variada para a multidão (v = semente); algumas crianças, alguns vestidos, alguns bonés */
export const folk = (v: number): Outfit => ({
  jacket: TEES[v % 8], pants: ["#3b5b9a", "#3b3f52", "#d9c7a0", "#5b4a3a"][(v * 3) % 4], boots: ["#f4f1ea", "#4a3426", "#2a201a"][v % 3],
  hat: v % 6 === 3 ? "cap" : "hair", cap: "#e8dcc0", hair: HAIRS[v % 5], skin: SK[(v * 7 + 2) % 5],
  build: v % 9 === 4 ? "kid" : v % 7 === 5 ? "stout" : undefined, dress: v % 5 === 1 ? ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] : undefined,
});

/** família de 4 (pai, mãe, criança, avó) com a posição de cada um relativa ao centro do grupo */
export const FAMILY: { o: Outfit; dx: number; dz: number; s: number; key: string }[] = [
  { o: { jacket: "#2f8a4f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#2a201a", skin: "#c99067", moustache: "#2a201a" }, dx: -0.95, dz: 0.1, s: 1, key: "dad" },
  { o: { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#4a3020", skin: "#ecd0b6", dress: "#e2453c" }, dx: 0.35, dz: 0.0, s: 1, key: "mom" },
  { o: { jacket: "#f08a2c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#3f6fb5", skin: "#e0b088", build: "kid" }, dx: -0.25, dz: 0.55, s: 0.75, key: "kid" },
  { o: { jacket: "#7b5ac9", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#e4e0d8", skin: "#f5c9a0", dress: "#8c6fb0", build: "stout" }, dx: 1.35, dz: 0.2, s: 0.93, key: "vo" },
];

export type Mood = "calm" | "nervous" | "shock" | "happy" | "whisper";
export const exprFor = (m: Mood, i: number): Expr =>
  m === "happy" ? (["laugh", "grin", "relief_open", "relief"] as Expr[])[i % 4]
  : m === "shock" ? (["shock", "shock", "nervous", "shock"] as Expr[])[i % 4]
  : m === "nervous" ? (["nervous", "stern", "nervous", "pained"] as Expr[])[i % 4]
  : m === "whisper" ? (["whistle", "nervous", "smile", "shock"] as Expr[])[i % 4]
  : (["smile", "neutral", "smile_closed", "neutral"] as Expr[])[i % 4];

/** alguém parado em (x, z): festa pula e acena; cochicho olha pro lado. `swaps` = tempos de troca de expressão (piscada) */
export const stander = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, x: number, z: number, m: Mood,
  extra: Partial<FrontOpts> = {}, sc = 1, swaps: number[] = []) => {
  const hop = m === "happy" ? Math.max(0, Math.sin(t * 8 + i * 1.9)) * 0.18 : 0;
  const wave = m === "happy" ? q(Math.sin(t * 9 + i * 1.3), 30) : undefined;
  const fo: FrontOpts = { mode: "stand", expr: exprFor(m, i), wave, blink: lidAt(t, i, swaps), look: m === "whisper" ? (i % 2 ? 1 : -1) : 0, ...extra };
  out.places.push(person(cam, { i, o, okey }, x, D0 + hop, z, { side: false, mirror: false }, fo, {}, sc));
  blob(out, x, D0, z, sc, hop > 0.05 ? 0.6 : 1);
};

/** pontos espalhados numa área retangular (determinístico pela semente) */
export const spots = (n: number, cx: number, cz: number, w: number, d: number, seed = 11): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + (hh(i, seed) - 0.5) * w, cz + (hh(i, seed + 1) - 0.5) * d]);

/** multidão nos pontos dados, com o humor e os extras por pessoa */
export const crowd = (out: Stage, cam: CamInfo, t: number, pts: [number, number][], moodOf: (i: number) => Mood,
  extra: (i: number) => Partial<FrontOpts> = () => ({}), swaps: number[] = [], base = 1100) => {
  pts.forEach(([x, z], i) => { const o = folk(i + 3); stander(out, cam, t, base + i, o, `folk${i}`, x, z, moodOf(i), extra(i), o.build === "kid" ? 0.75 : 1, swaps); });
};

// ---------------- balões ----------------
export type BubbleIcon = "msg" | "tv" | "bang" | "beep";
/** balão de fala (500 x 420): caixa branca com rabinho e um ícone dentro */
export const bubble = (p: Pen, icon: BubbleIcon) => {
  const g = p.g;
  p.poly([[40, 40], [460, 40], [460, 300], [250, 300], [170, 390], [190, 300], [40, 300]], "#fbf8f1", 14);
  if (icon === "msg") { // lâmpada riscada + folhinha de calendário "17"
    p.ell(150, 150, 55, 58, "#ffd84a", 10); p.poly([[125, 205], [175, 205], [170, 245], [130, 245]], "#9aa3ad", 8);
    p.stroke([[85, 240], [215, 80]], 18, "#c8323a");
    p.poly([[270, 90], [420, 90], [420, 260], [270, 260]], "#f4f1ea", 10); p.poly([[270, 90], [420, 90], [420, 135], [270, 135]], "#c8323a", 10);
    g.font = "bold 100px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("17", 345, 200);
  } else if (icon === "tv") {
    p.poly([[100, 95], [300, 95], [300, 235], [100, 235]], "#5ec8d8", 12); p.stroke([[160, 95], [130, 55]], 9); p.stroke([[240, 95], [270, 55]], 9);
    g.font = "bold 190px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("?", 385, 175);
  } else if (icon === "bang") {
    p.poly([[230, 70], [300, 70], [285, 215], [245, 215]], "#c8323a", 10); p.ell(265, 255, 24, 24, "#c8323a", 10);
  } else {
    p.ell(170, 220, 46, 34, "#3f6fb5", 10, 0, 360, -20); p.stroke([[210, 210], [210, 80]], 14); p.poly([[210, 80], [300, 110], [300, 150], [210, 120]], "#3f6fb5", 10);
    p.ell(330, 200, 46, 34, "#3f6fb5", 10, 0, 360, -20); p.stroke([[370, 190], [370, 70]], 14);
  }
};
const pop = (t: number, t0: number) => (t < t0 ? 0 : Math.min(1, 0.6 + 1.6 * (t - t0) - 0.2 * Math.max(0, t - t0 - 0.25)));
/** balão que surge com um "pop" em t0 e flutua; some depois de `life` s */
export const bubbleFx = (out: Stage, t: number, t0: number, icon: BubbleIcon, x: number, y: number, z: number, s = 1.1, life = 99) => {
  if (t < t0 || t > t0 + life) return;
  const k = q(pop(t, t0), 10), w = s * k;
  out.fx.push({ key: `bub|${icon}`, cw: 500, ch: 420, draw: (p) => bubble(p, icon), x, y: y + 0.12 * Math.sin(t * 3 + x), z, w, h: w * 0.84 });
};

// ---------------- efeitos ----------------
/** estrela de impacto por 0,4 s a partir de t0 */
export const burst = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s = 3) => {
  if (t < t0 || t >= t0 + 0.4) return;
  const u = q((t - t0) / 0.4, 30);
  out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y, z, w: s, h: s });
};
/** anéis vermelhos pulsando (sirene / alerta) em volta de um ponto */
export const rings = (out: Stage, t: number, x: number, y: number, z: number, r0 = 3.6) => {
  for (let k = 0; k < 2; k++) {
    const u = q(((t * 1.6 + k * 0.5) % 1), 15), r = r0 + 3 * u;
    out.fx.push({ key: `ring${u}`, cw: 400, ch: 400, soft: true, draw: (p) => { const g = p.g; g.strokeStyle = `rgba(255,90,80,${(0.8 * (1 - u)).toFixed(2)})`; g.lineWidth = 22; g.beginPath(); g.arc(200, 200, 170, 0, 7); g.stroke(); }, x, y, z: z - 0.3, w: r, h: r });
  }
};
const CONF = ["#e2453c", "#f3d35a", "#3f9a4f", "#f4f1ea", "#f08a2c", "#7b5ac9"];
/** confete caindo numa área de `spread` m em volta de (cx, cy) a partir de t0 */
export const confetti = (out: Stage, t: number, t0: number, cx: number, cy: number, spread = 5, n = 44) => {
  if (t < t0) return;
  for (let i = 0; i < n; i++) {
    const col = CONF[i % 6], fall = 1.1 + hh(i, 2) * 0.6, life = 5.5;
    const age = ((t - t0 + hh(i, 4) * life) % life);
    const x = cx + (hh(i, 6) - 0.5) * spread + 0.35 * Math.sin(t * 3 + i), y = cy + 6.5 - age * fall, z = -5 + hh(i, 8) * 6;
    if (y < D0 + 0.2) continue;
    out.fx.push({ key: `conf|${col}`, cw: 64, ch: 40, draw: (p) => { p.poly([[4, 4], [60, 4], [60, 36], [4, 36]], col, 5); }, x, y, z, w: 0.2, h: 0.125, rot: t * (2 + hh(i, 9) * 4) + i });
  }
};
export type KitItem = "bag" | "water" | "lantern" | "batt";
/** itens de kit de emergência (300 x 300): mochila com cruz, garrafa d'água, lanterna, pilhas */
export const kitItem = (p: Pen, kind: KitItem) => {
  if (kind === "bag") { p.poly([[50, 90], [250, 90], [265, 285], [35, 285]], "#f08a2c", 12); p.stroke([[100, 90], [110, 35], [190, 35], [200, 90]], 12); p.poly([[95, 160], [205, 160], [205, 230], [95, 230]], "#f4f1ea", 8); p.stroke([[150, 168], [150, 222]], 12, "#c8323a"); p.stroke([[123, 195], [177, 195]], 12, "#c8323a"); }
  else if (kind === "water") { p.poly([[95, 70], [205, 70], [215, 285], [85, 285]], "#9fd4ff", 12); p.poly([[120, 25], [180, 25], [180, 70], [120, 70]], "#3f6fb5", 10); p.poly([[88, 150], [212, 150], [212, 205], [88, 205]], "#f4f1ea", 8); }
  else if (kind === "lantern") { p.poly([[110, 120], [190, 120], [190, 285], [110, 285]], "#f08a2c", 12); p.poly([[85, 40], [215, 40], [190, 120], [110, 120]], "#3a3f55", 12); p.ell(150, 40, 65, 16, "#fff6c8", 10); }
  else { for (const x of [70, 150, 230]) { p.poly([[x - 32, 80], [x + 32, 80], [x + 32, 285], [x - 32, 285]], "#2a2833", 10); p.poly([[x - 32, 80], [x + 32, 80], [x + 32, 140], [x - 32, 140]], "#e8873a", 8); p.poly([[x - 12, 62], [x + 12, 62], [x + 12, 80], [x - 12, 80]], "#c9ccd2", 6); } }
};
/** facho de lanterna (cartão suave, 300 x 600) */
export const beam = (p: Pen) => {
  const g = p.g, gr = g.createLinearGradient(150, 600, 150, 0);
  gr.addColorStop(0, "rgba(255,246,200,0.75)"); gr.addColorStop(1, "rgba(255,246,200,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(130, 600); g.lineTo(170, 600); g.lineTo(300, 0); g.lineTo(0, 0); g.closePath(); g.fill();
};
