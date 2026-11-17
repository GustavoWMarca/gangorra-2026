// "A gangorra de 2026": as eleições presidenciais de 2026 contadas numa gangorra gigante numa praça.
// Lado esquerdo (azul) = Flávio Bolsonaro, lado direito (vermelho) = Lula, cinzentos no meio = eleitores dos outros 11.
//   S1 gancho: a gangorra pende pro azul e, em "ganhou", vira pro vermelho
//   S2 4 de outubro: eleitores passeando diante de uma urna eletrônica gigante
//   S3 1º turno: pende pro azul em "frente"; câmera desliza pro lado vermelho em "Lula"
//   S4 "ninguém passa de 50": quase no meio, balançando
//   S5 21 dias depois (fim de tarde): nivela, zerada
//   S6 explicação: os 11 cinzentos escolhem um lado; vira pro vermelho em "lado"
//   S7 resultado: festa no lado vermelho
//   S8 virada: bolo de 81 anos
export const FPS = 30;
export const TOTAL = 1160; // voz de 38,1 s + respiro
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
/** mola amortecida: 0 -> 1 com um quique */
export const spring = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(9 * u));

/** tempos das palavras (s) — words.json */
export const T_GANHOU = 4.354;
export const T_FRENTE = 10.575;
export const T_LULA1 = 11.643;
export const T_NINGUEM = 14.234;
export const T_SEGUNDO = 17.823;
export const T_GANGORRA = 21.885;
export const T_ZERA = 22.55;
export const T_QUEM = 23.327;
export const T_LADO = 25.554;
export const T_LEVA = 26.794;
export const T_RECORDE = 31.421;
export const T_FEZ = 34.375;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Crowd = "hook" | "voters" | "round1" | "wobble" | "level" | "runoff" | "final" | "cake";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 162, light: "day", crowd: "hook" },
  { id: 2, a: 162, b: 276, light: "day", crowd: "voters" },
  { id: 3, a: 276, b: 417, light: "day", crowd: "round1" },
  { id: 4, a: 417, b: 494, light: "day", crowd: "wobble" },
  { id: 5, a: 494, b: 573, light: "golden", crowd: "level" },
  { id: 6, a: 573, b: 795, light: "day", crowd: "runoff" },
  { id: 7, a: 795, b: 1020, light: "day", crowd: "final" },
  { id: 8, a: 1020, b: TOTAL, light: "golden", crowd: "cake" },
];
export const XFADE: Record<number, number> = { 5: 12, 6: 10, 8: 12 };
export const FLASH_AT = 162;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the seesaw ----------------
// pivot at (0, PIVOT_Y, 0), beam along x; tilt in degrees, + = right (red) side down
export const PIVOT_Y = 2.0;
export const BEAM_HALF = 8.0;
export const PLAT = { x0: 3.6, x1: 8.0, top: 2.4, z0: -2.6, z1: 2.6 };
export const TILT_MAX = 6.5;
export const tiltAt = (id: number, t: number): number => {
  switch (id) {
    case 1: return t < T_GANHOU - 0.1 ? -6 + 0.5 * Math.sin(t * 3) : -6 + 14 * spring((t - T_GANHOU + 0.1) / 0.9);
    case 2: return -1.5;
    case 3: return t < T_FRENTE - 0.1 ? -0.6 * Math.sin(t * 2.4) : -6 * spring((t - T_FRENTE + 0.1) / 0.9);
    case 4: { const u = t - SHOTS[3].a / FPS; return -6 + 3 * smooth(u / 1.2) + 1.6 * Math.sin(u * 7) * Math.exp(-0.4 * u); }
    case 5: { const u = t - SHOTS[4].a / FPS; return -3 * (1 - smooth((t - T_SEGUNDO + 0.5) / 1.0)) + 0.4 * Math.sin(u * 5) * (t < T_SEGUNDO ? 1 : 0); }
    case 6: {
      if (t < T_LADO - 0.1) { const w = clamp01((t - T_QUEM) / 2); return 0.7 * Math.sin(t * 6) * w; }
      return 8 * spring((t - T_LADO + 0.1) / 0.9);
    }
    default: return 8;
  }
};
/** local seesaw point -> world (rotation about the pivot) */
export const onSeesaw = (lx: number, ly: number, lz: number, tiltDeg: number): V3 => {
  const p = (-tiltDeg * Math.PI) / 180, c = Math.cos(p), s = Math.sin(p), y = ly - PIVOT_Y;
  return [lx * c - y * s, PIVOT_Y + lx * s + y * c, lz];
};

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
/** every hold creeps in: a slow zoom (the lens stays put, so the foreground cast never leaves the frame) */
const dolly = (pos: V3, look: V3, f: number, f0: number, rate = 0.0025, rest: Partial<Cam> = {}): Shot => {
  const k = Math.exp(-rate * Math.max(0, f - f0)), fov = rest.fov ?? 40;
  return { pos, look, ...rest, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k) };
};
const F = (t: number) => Math.round(t * FPS);
// the red candidate in the final shots (settled tilt)
export const RED_CAND = onSeesaw(5.8, PLAT.top, -2.0, 8);

const CAMS: Record<number, Key[]> = {
  // hook: oblique view down the beam from above the red end, blue end far
  1: [
    { f: 0, s: (f) => dolly([6.5, 3.8, -13], [3.4, 2.1, 0], f, 0, 0.0012, { fov: 60, roll: 0.02 }) },
    { f: F(T_GANHOU) - 4, dur: 30, s: (f) => dolly([8, 3.6, -11], [5.2, 2.0, 0], f, F(T_GANHOU), 0.0015, { fov: 52, roll: -0.03 }) },
  ],
  // 4 de outubro: voters stroll past the giant ballot box
  2: [{ f: 162, s: (f) => dolly([-27, 2.4, -8], [-33, 3.4, 13], f, 162, 0.0018, { fov: 50, roll: -0.02 }) }],
  // 1º turno: blue side first, glide to the red side on "Lula"
  3: [
    { f: 276, s: (f) => dolly([-8, 3.6, -11], [-5.2, 2.2, 0], f, 276, 0.0016, { fov: 52, roll: 0.03 }) },
    { f: F(T_LULA1) - 4, dur: 30, s: (f) => dolly([8, 3.6, -11], [5.2, 2.0, 0], f, F(T_LULA1), 0.0018, { fov: 52, roll: -0.03 }) },
  ],
  // ninguém passa de 50: frontal, the grey voters in front of the pivot
  4: [{ f: 417, s: (f) => dolly([0, 3.2, -12.5], [0, 1.6, -2.5], f, 417, 0.0016, { fov: 58 }) }],
  // fim de tarde: the whole seesaw against the low sun
  5: [{ f: 488, s: (f) => dolly([-6, 3.6, -24], [0, 2.2, 0], f, 488, 0.0014, { fov: 56, roll: 0.03 }) }],
  // explicação: frontal on the greys, then rise to an oblique wide as they pick sides
  6: [
    { f: 567, s: (f) => dolly([0, 3.0, -12], [0, 1.6, -2.5], f, 567, 0.0012, { fov: 58 }) },
    { f: F(T_QUEM) - 6, dur: 50, s: (f) => dolly([0.3, 5.0, -18.5], [0.5, 1.8, 0], f, F(T_QUEM), 0.0012, { fov: 64, roll: -0.015 }) },
  ],
  // resultado: close on the red platform party
  7: [
    { f: 795, s: (f) => dolly([RED_CAND[0] - 3.5, RED_CAND[1] + 0.3, -11], [RED_CAND[0] + 0.6, RED_CAND[1] + 1.4, 0], f, 795, 0.0016, { fov: 46, roll: 0.03 }) },
    { f: F(T_RECORDE) - 4, dur: 40, s: (f) => dolly([RED_CAND[0] - 2.5, RED_CAND[1] + 0.4, -9.5], [RED_CAND[0] + 0.3, RED_CAND[1] + 1.3, 0], f, F(T_RECORDE), 0.002, { fov: 44, roll: -0.03 }) },
  ],
  // virada: the candidate and his birthday cake at dusk
  8: [{ f: 1014, s: (f) => dolly([RED_CAND[0] - 1.6, RED_CAND[1] + 0.9, -8.2], [RED_CAND[0] + 0.2, RED_CAND[1] + 1.15, -2], f, 1014, 0.0022, { fov: 40, roll: 0.02 }) }],
};
/** impact kicks: flip sign every frame, decay over 7 frames */
const KICKS = [T_GANHOU, T_FRENTE, T_LADO];
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

// ---------------- lens blur per beat (cInf px at 1080; 0 = sharp) ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 5 },
  { f: 162, cInf: 9, focus: () => [-29, 1.4, 3] },
  { f: 276, cInf: 6 },
  { f: 417, cInf: 7, focus: () => [0, 1.2, -4.2] },
  { f: 494, cInf: 0 },
  { f: 573, cInf: 6, focus: () => [0, 1.2, -4.2] },
  { f: 693, dur: 30, cInf: 0 },
  { f: 795, cInf: 12, focus: () => RED_CAND },
  { f: 1020, cInf: 12, focus: () => RED_CAND },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
