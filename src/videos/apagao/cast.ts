// Elenco do apagão, montado com o kit: a família na porta de casa (celular, kit na mesa, lanterna), a praça no celular,
// o povo diante da TV, os vizinhos cochichando, o boato em balões e a praça no escuro.
import { FrontOpts } from "../../kit/toon";
import { CamInfo, Stage, beginStage, q, hh } from "../../kit/cast-core";
import { FAMILY, Mood, stander, crowd, spots, folk, bubbleFx, burst, rings, kitItem, beam, KitItem } from "../../kit/cast-kit";
import { SHOTS, D0 } from "./story";
import * as S from "./story";

export type { CamInfo, Stage };
const SWAPS: Record<number, number[]> = { 2: [S.T_MSG, S.T_SEMLUZ], 6: [S.T_APITO], 8: [S.T_ESCURO] };
const SQUARE = spots(30, 0, -2.25, 16, 9.5);

const family = (out: Stage, cam: CamInfo, id: number, t: number) => {
  const [fx0, , fz0] = S.FAMILY;
  FAMILY.forEach((m, i) => {
    let mood: Mood = "calm", prop: FrontOpts["prop"] = null;
    if (id === 2) { mood = t >= S.T_SEMLUZ - 0.07 ? "shock" : t >= S.T_MSG - 0.07 ? "nervous" : "calm"; if (i === 0) prop = "phone"; }
    if (id === 4) mood = i === 2 ? "happy" : "nervous";
    if (id === 10) { mood = "happy"; if (i === 2 && t >= S.T_KIT2 - 0.07) prop = "lantern"; }
    const extra: Partial<FrontOpts> = { prop, facing: i === 3 ? -1 : i === 0 ? 1 : 0 };
    if (id === 10 && i !== 2) extra.wave = undefined;
    stander(out, cam, t, 1000 + i, m.o, m.key, fx0 + m.dx, fz0 + m.dz, mood, extra, m.s, SWAPS[id]);
  });
  if (id === 2) bubbleFx(out, t, S.T_MSG - 0.07, "msg", fx0 - 0.5, 2.85, fz0 + 0.3, 1.25);
  if (id === 2) burst(out, t, S.T_SEMLUZ, fx0 + 0.2, 1.9, fz0 - 0.2, 2.6);
  // kit items pop onto the table (shots 4 and 10)
  const [tx, , tz] = S.TABLE, top = 0.9;
  const items: [number, KitItem, number, number, number][] = [[S.T_KIT, "bag", -0.42, 0.56, 0.56], [S.T_AGUA, "water", 0.0, 0.32, 0.56], [S.T_LANT, "lantern", 0.3, 0.32, 0.38], [S.T_PILHA, "batt", 0.58, 0.28, 0.28]];
  if (id === 4 || id === 10) for (const [t0, kind, dx, w, h] of items) {
    if (id === 4 && t < t0 - 0.07) continue;
    if (id === 10 && kind === "lantern" && t >= S.T_KIT2 - 0.07) continue; // the kid picked it up
    const k = id === 4 ? q(Math.min(1, 0.5 + 2.5 * (t - t0 + 0.07)), 10) : 1;
    out.fx.push({ key: `item|${kind}`, cw: 300, ch: 300, draw: (p) => kitItem(p, kind), x: tx + dx, y: D0 + top + (h * k) / 2, z: tz - 0.05, w: w * k, h: h * k });
  }
  if (id === 10 && t >= S.T_KIT2 - 0.07) {
    const kx = fx0 + FAMILY[2].dx, kz = fz0 + FAMILY[2].dz;
    out.fx.push({ key: "beam", cw: 300, ch: 600, soft: true, draw: (p) => beam(p), x: kx + 0.75, y: 1.75, z: kz - 0.15, w: 1.2, h: 2.4, rot: -0.5 });
  }
};

const tvCrowd = (out: Stage, cam: CamInfo, t: number, mood: Mood, swaps: number[] = []) => {
  const [tvx, , tvz] = S.TV;
  for (let i = 0; i < 8; i++) { const o = folk(i + 20); stander(out, cam, t, 1200 + i, o, `tv${i}`, tvx - 3.2 + (i % 4) * 2.1 + hh(i) * 0.5, tvz - 4.2 - (i >> 2) * 1.6, mood, { look: 0 }, o.build === "kid" ? 0.75 : 1, swaps); }
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  beginStage(s.light, cam);
  const [tvx, , tvz] = S.TV;
  switch (s.crowd) {
    case "square": crowd(out, cam, t, SQUARE.slice(0, 16), (i) => (i % 3 ? "nervous" : "shock"), () => ({ prop: "phone" })); break;
    case "family": case "kit": case "lantern": family(out, cam, id, t); break;
    case "tv": tvCrowd(out, cam, t, t >= S.T_ALARME - 0.07 ? "shock" : "nervous"); if (t >= S.T_ALARME) rings(out, t, tvx, S.TV_Y, tvz); break;
    case "gossip": {
      const [gx, , gz] = S.GOSSIP;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI - 0.2, o = folk(i + 40); stander(out, cam, t, 1300 + i, o, `gos${i}`, gx + Math.cos(a) * 1.9 - 0.2, gz - Math.sin(a) * 0.9, "whisper", {}, o.build === "kid" ? 0.75 : 1); }
      bubbleFx(out, t, S.T_SIMP - 0.07, "tv", gx - 0.9, 2.75, gz - 0.3, 1.0);
      bubbleFx(out, t, S.T_SIMP + 0.6, "bang", gx + 0.6, 2.6, gz - 0.6, 0.8);
      break;
    }
    case "rumor": {
      const wide = t >= S.T_BOATO - 0.12;
      tvCrowd(out, cam, t, wide ? "nervous" : t >= S.T_APITO ? "happy" : "calm", SWAPS[6]);
      if (t >= S.T_APITO - 0.07 && t < S.T_APITO + 1.6) bubbleFx(out, t, S.T_APITO - 0.07, "beep", tvx - 1.0, S.TV_Y - 2.1, tvz - 1.4, 1.0);
      if (wide) {
        crowd(out, cam, t, SQUARE.slice(0, 24), () => "nervous", () => ({ prop: "phone" }));
        SQUARE.slice(0, 24).forEach(([x, z], i) => { if (Math.abs(x) <= 3.6) bubbleFx(out, t, S.T_BOATO + Math.hypot(x - 3, z + 2) * 0.09, (["bang", "msg", "tv"] as const)[i % 3], x, 2.9, z, 1.0); });
      }
      break;
    }
    case "grid": { const [x, , z] = S.towerPos(S.N_TOWERS - 1); burst(out, t, S.T_CAIU - 0.1, x, S.TOWER_H * 0.8, z, 9); break; }
    case "dark": crowd(out, cam, t, SQUARE.slice(0, 18), (i) => (t >= S.T_ESCURO - 0.07 ? "shock" : i % 2 ? "nervous" : "calm"), () => ({ prop: "phone" }), SWAPS[8]); break;
    case "relief": { const on = S.lightsAt(id, t).on > 0.9; crowd(out, cam, t, SQUARE.slice(0, 18), () => (on ? "happy" : "nervous")); break; }
  }
  return out;
};
