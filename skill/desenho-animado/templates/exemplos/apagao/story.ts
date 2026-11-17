// "O apagão do dia 17": o boato do apagão mundial de 17/11/2026 e por que o medo pegou.
// Uma cidadezinha ao entardecer, janelas acesas, uma TV de praça, uma família, e uma fileira de torres de energia
// que cai como dominó e apaga a cidade.
//   1 praça: todo mundo no celular, com medo           6 TV: só um apito; depois o boato se espalha (balões)
//   2 família: a mensagem "dia 17 sem luz"            7 torres: rede = dominó; em 2023 caem e a cidade apaga
//   3 TV da praça: o teste de alerta dos EUA          8 praça à noite: tudo apaga de uma vez (Espanha/Portugal)
//   4 família monta o kit: água, lanterna, pilha      9 a luz volta: alívio
//   5 vizinhos cochichando ("os Simpsons previram")  10 família com o kit e a lanterna acesa
import { tw, lineStart, VOICE_END } from "./timing";
import { hillSolids } from "../../kit/sets";
export const FPS = 30;
export const TOTAL = Math.round((VOICE_END + 1.45) * 30); // fim da voz + respiro
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const spring = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(9 * u));

/** tempos das palavras (s) — out/apagao/words.json */
export const T_MSG = tw(1, "mensagem"), T_SEMLUZ = tw(1, "sem"), T_PROVA = tw(2, "prova"), T_ALARME = tw(2, "alarme");
export const T_KIT = tw(3, "kit"), T_AGUA = tw(3, "água"), T_LANT = tw(3, "lanterna"), T_PILHA = tw(3, "pilha");
export const T_SIMP = tw(4, "Simpsons"), T_SORTE = tw(5, "sorte"), T_APITO = tw(5, "apito"), T_BOATO = tw(5, "boato");
export const T_SABE = tw(6, "sabe"), T_DOMINO = tw(6, "dominó"), T_CAIU = tw(7, "caiu"), T_APAGOU = tw(7, "apagou");
export const T_ESCURO = tw(8, "escuro"), T_NAO = tw(9, "não"), T_KIT2 = tw(10, "kit"), T_QUALQUER = tw(10, "qualquer");

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "square" | "family" | "tv" | "kit" | "gossip" | "rumor" | "grid" | "dark" | "relief" | "lantern";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd };
/** each shot starts 0,15 s before the first word of its line of the script */
const L = (line: number) => Math.max(0, Math.round((lineStart(line) - 0.15) * FPS));
const SHOT_LINES: [number, Light, Crowd][] = [
  [-1, "golden", "square"], [1, "golden", "family"], [2, "golden", "tv"], [3, "golden", "kit"], [4, "golden", "gossip"],
  [5, "golden", "rumor"], [6, "golden", "grid"], [8, "golden", "dark"], [9, "golden", "relief"], [10, "golden", "lantern"],
];
export const SHOTS: ShotDef[] = SHOT_LINES.map(([line, light, crowd], i) => ({
  id: i + 1, a: line < 0 ? 0 : L(line), b: i + 1 < SHOT_LINES.length ? L(SHOT_LINES[i + 1][0]) : TOTAL, light, crowd,
}));
/** first frame of shot `id` */
export const A = (id: number) => SHOTS[id - 1].a;
export const XFADE: Record<number, number> = { 7: 12, 8: 10, 10: 10 };
export const FLASH_AT = A(2);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the grid (transmission towers) ----------------
export const N_TOWERS = 9;
export const TOWER_X = 16, TOWER_Z0 = 48, TOWER_DZ = 22, TOWER_H = 22;
export const towerPos = (i: number): V3 => [TOWER_X + Math.sin(i * 1.3) * 1.5, D0, TOWER_Z0 + i * TOWER_DZ];
/** fall angle (deg, toward -z = toward town) of tower i; the far end goes first */
export const FALL_GAP = 0.12;
export const towerFall = (id: number, t: number, i: number): number => {
  if (id !== 7) return 0;
  if (t < T_CAIU - 0.1) return t > T_DOMINO - 0.1 && t < T_DOMINO + 0.8 ? 2.5 * Math.sin((t - T_DOMINO) * 18) * Math.exp(-4 * (t - T_DOMINO)) * (i === N_TOWERS - 1 ? 1 : 0.3) : 0;
  const t0 = T_CAIU - 0.1 + (N_TOWERS - 1 - i) * FALL_GAP, u = (t - t0) / 0.55;
  if (u <= 0) return 0;
  if (u < 1) return 84 * u * u;
  return 84 + 3 * Math.exp(-6 * (u - 1)) * Math.sin(14 * (u - 1));
};

// ---------------- town lights ----------------
/** fraction of window groups lit (0..1, groups go out in order) and the scene dimmer */
export const lightsAt = (id: number, t: number): { on: number; dim: number } => {
  if (id === 7) {
    const u = clamp01((t - T_APAGOU) / 0.5);
    return { on: 1 - u, dim: 1 - 0.6 * u };
  }
  if (id === 8) {
    if (t < T_ESCURO - 0.05) return { on: 1, dim: 1 };
    const k = Math.max(0, Math.round((t - T_ESCURO) * FPS));
    const flick = k < 4 ? [0.6, 0.1, 0.4, 0][k] : 0;
    return { on: flick, dim: 0.5 + 0.5 * flick };
  }
  if (id === 9) {
    const t0 = SHOTS[8].a / FPS + 0.35, k = Math.round((t - t0) * FPS);
    if (k < 0) return { on: 0, dim: 0.5 };
    const v = k < 6 ? [0.4, 0, 0.7, 0.2, 1, 0.8][k] : 1;
    return { on: v, dim: 0.5 + 0.5 * v };
  }
  return { on: 1, dim: 1 };
};

// ---------------- places ----------------
export const FAMILY: V3 = [0, D0, -23.2];      // the family stands at their door (house front at z = -26)
export const TABLE: V3 = [2.3, D0, -22.4];
export const TV: V3 = [9, D0, 7];              // public TV on a pole, screen faces -z
export const TV_Y = 4.6;
export const GOSSIP: V3 = [-7, D0, -3];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const dolly = (pos: V3, look: V3, f: number, f0: number, rate = 0.0025, rest: Partial<Cam> = {}): Shot => {
  const k = Math.exp(-rate * Math.max(0, f - f0)), fov = rest.fov ?? 40;
  return { pos, look, ...rest, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k) };
};
const F = (t: number) => Math.round(t * FPS);
const fam = FAMILY;

const CAMS: Record<number, Key[]> = {
  // praça: crowd on phones, houses lit behind
  1: [{ f: 0, s: (f) => dolly([-1.5, 1.7, 9], [0.5, 2.2, -4], f, 0, 0.0018, { fov: 50, roll: 0.02 }) }],
  // família: close at their door
  2: [
    { f: A(2), s: (f) => dolly([fam[0] + 0.4, 1.6, fam[2] + 7.0], [fam[0] + 0.2, 1.5, fam[2]], f, A(2), 0.0007, { fov: 52, roll: -0.02 }) },
    { f: F(T_SEMLUZ) - 4, dur: 20, s: (f) => dolly([fam[0] + 0.3, 1.55, fam[2] + 6.6], [fam[0] + 0.2, 1.55, fam[2]], f, F(T_SEMLUZ), 0.0008, { fov: 52, roll: 0.02 }) },
  ],
  // TV da praça: low, the screen high over the crowd
  3: [{ f: A(3), s: (f) => dolly([TV[0] - 3, 1.5, TV[2] - 10], [TV[0], TV_Y - 0.6, TV[2]], f, A(3), 0.002, { fov: 50, roll: 0.03 }) }],
  // kit on the table in front of the family
  4: [{ f: A(4), s: (f) => dolly([fam[0] + 1.1, 2.2, fam[2] + 9.0], [fam[0] + 1.1, 1.15, fam[2] + 0.3], f, A(4), 0.0006, { fov: 58, roll: -0.02 }) }],
  // vizinhos cochichando
  5: [{ f: A(5), s: (f) => dolly([GOSSIP[0] - 0.2, 1.7, GOSSIP[2] + 6.8], [GOSSIP[0] - 0.2, 1.7, GOSSIP[2]], f, A(5), 0.0016, { fov: 52, roll: 0.03 }) }],
  // TV again, then pull back wide over the square as the rumor spreads
  6: [
    { f: A(6), s: (f) => dolly([TV[0] - 2, 1.6, TV[2] - 8.5], [TV[0], TV_Y - 0.9, TV[2]], f, A(6), 0.0018, { fov: 50, roll: -0.02 }) },
    { f: F(T_BOATO) - 4, cut: true, s: (f) => dolly([1, 9, 17], [0, 1, -3], f, F(T_BOATO) - 4, 0.0015, { fov: 56, roll: 0.01 }) },
  ],
  // torres: from the hill, the line marching to the lit town
  7: [
    { f: A(7) - 6, s: (f) => dolly([46, 26, 302], [14, 5, 140], f, A(7) - 6, 0.0008, { fov: 54, roll: 0.02 }) },
    { f: F(T_DOMINO) - 10, dur: 40, s: (f) => dolly([42, 24, 292], [14, 4, 132], f, F(T_DOMINO), 0.0008, { fov: 56, roll: -0.02 }) },
  ],
  // praça à noite: wide-ish crowd
  8: [{ f: A(8) - 5, s: (f) => dolly([1, 2.4, 12], [0, 2.4, -6], f, A(8) - 5, 0.0018, { fov: 54 }) }],
  // a luz volta
  9: [{ f: A(9), s: (f) => dolly([-2, 2.0, 10], [0, 2.4, -5], f, A(9), 0.002, { fov: 52, roll: 0.02 }) }],
  // família com a lanterna
  10: [{ f: A(10) - 5, s: (f) => dolly([fam[0] + 1.1, 2.1, fam[2] + 9.0], [fam[0] + 1.1, 1.3, fam[2] + 0.3], f, A(10) - 5, 0.0006, { fov: 58, roll: 0.02 }) }],
};
const KICKS = [T_SEMLUZ, T_APAGOU, T_ESCURO];
export const kickAt = (t: number) => {
  for (const k of KICKS) { const n = Math.round((t - k) * FPS); if (n >= 0 && n < 7) return (n % 2 ? -1 : 1) * (1 - n / 7); }
  return 0;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a * 2.5;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.006 };
};

export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [{ f: 0, cInf: 0 }];
export const dofAt = (f: number) => ({ cInf: 0 * f, focus: undefined as undefined | ((f: number) => V3) });
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

// ---------------- preflight (scripts/preflight.mjs) ----------------
/** important things that must be whole on screen in their shots (from/to in seconds) */
export const CHECKS: { name: string; shots: number[]; box: [V3, V3]; from?: number; to?: number; tol?: number }[] = [
  { name: "mesa do kit", shots: [4, 10], box: [[TABLE[0] - 0.8, 0, TABLE[2] - 0.45], [TABLE[0] + 0.8, 1.5, TABLE[2] + 0.45]] },
  { name: "tela da TV", shots: [3, 6], box: [[TV[0] - 1.9, TV_Y - 1.25, TV[2] - 0.1], [TV[0] + 1.9, TV_Y + 1.25, TV[2] + 0.5]], to: T_BOATO - 0.2 },
  ...[0, 4, 8].map((i) => ({ name: `torre ${i + 1}`, shots: [7], box: [[towerPos(i)[0] - 3, 0, towerPos(i)[2] - 1], [towerPos(i)[0] + 3, TOWER_H, towerPos(i)[2] + 1]] as [V3, V3], to: T_CAIU, tol: 0.02 })),
  { name: "família", shots: [2, 4, 10], box: [[FAMILY[0] - 1.4, 0, FAMILY[2] - 0.2], [FAMILY[0] + 1.8, 2.0, FAMILY[2] + 0.6]], tol: 0.12 },
];
/** solids the camera must never be inside */
export const SOLIDS: { name: string; box: [V3, V3] }[] = hillSolids();
