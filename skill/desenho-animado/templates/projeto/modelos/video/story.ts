// __TITULO__ — linha do tempo. Tudo sai da narração (timing.ts): cada linha do roteiro costuma ser uma cena.
// Edite: SHOT_LINES (que linha abre cada cena, luz e quem está em cena), os tempos T_* (palavra que dispara cada
// reação), as câmeras (CAMS) e o que precisa aparecer inteiro (CHECKS). Rode `npm run produzir -- __nome__`.
import { tw, lineStart, VOICE_END } from "./timing";
import { hillSolids } from "../../kit/sets";
export const FPS = 30;
export const TOTAL = Math.round((VOICE_END + 1.45) * 30);
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** palavras que disparam reações. Troque pelos tempos das palavras certas: tw(linha do roteiro, "palavra") */
export const T_GANCHO = lineStart(0) + 0.6;
export const T_VIRADA = lineStart(1);
void tw;

// ---------------- cenas ----------------
export type Light = "day" | "golden";
export type Crowd = "praca" | "familia";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd };
const L = (line: number) => Math.max(0, Math.round((lineStart(line) - 0.15) * FPS));
/** [linha do roteiro que abre a cena (-1 = começo), luz, elenco] */
const SHOT_LINES: [number, Light, Crowd][] = [[-1, "day", "praca"], [1, "golden", "familia"]];
export const SHOTS: ShotDef[] = SHOT_LINES.map(([line, light, crowd], i) => ({
  id: i + 1, a: line < 0 ? 0 : L(line), b: i + 1 < SHOT_LINES.length ? L(SHOT_LINES[i + 1][0]) : TOTAL, light, crowd,
}));
export const A = (id: number) => SHOTS[id - 1].a;
export const XFADE: Record<number, number> = { 2: 10 };
export const FLASH_AT = A(2);
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- lugares ----------------
export const FAMILY: V3 = [0, D0, -23.2];

// ---------------- câmera ----------------
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
  for (let i = 1; i < keys.length; i++) { const k = keys[i]; if (f < k.f) break; cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24))); }
  return cur;
};
/** toda espera avança devagar: zoom lento (rate baixo = menos corte nas bordas) */
const dolly = (pos: V3, look: V3, f: number, f0: number, rate = 0.0012, rest: Partial<Cam> = {}): Shot => {
  const k = Math.exp(-rate * Math.max(0, f - f0)), fov = rest.fov ?? 40;
  return { pos, look, ...rest, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k) };
};
const fam = FAMILY;
const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => dolly([-1.5, 1.8, 10], [0.5, 2.0, -4], f, 0, 0.0015, { fov: 52, roll: 0.02 }) }],
  2: [{ f: A(2), s: (f) => dolly([fam[0] + 0.4, 1.6, fam[2] + 7.0], [fam[0] + 0.2, 1.5, fam[2]], f, A(2), 0.0007, { fov: 52, roll: -0.02 }) }],
};
const KICKS = [T_VIRADA];
export const kickAt = (t: number) => {
  for (const k of KICKS) { const n = Math.round((t - k) * FPS); if (n >= 0 && n < 7) return (n % 2 ? -1 : 1) * (1 - n / 7); }
  return 0;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ln = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ln * a * 2.5;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.006 };
};
export const dofAt = (_f: number) => ({ cInf: 0, focus: undefined as undefined | ((f: number) => V3) });

// ---------------- verificador (scripts/preflight.mjs) ----------------
export const CHECKS: { name: string; shots: number[]; box: [V3, V3]; from?: number; to?: number; tol?: number }[] = [
  { name: "família", shots: [2], box: [[FAMILY[0] - 1.4, 0, FAMILY[2] - 0.2], [FAMILY[0] + 1.8, 2.0, FAMILY[2] + 0.6]], tol: 0.12 },
];
export const SOLIDS: { name: string; box: [V3, V3] }[] = hillSolids();
