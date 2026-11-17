// __TITULO__ — elenco com o kit (src/kit/cast-kit.ts): multidão, família, balões, explosão, confete, sirene, itens.
import { CamInfo, Stage, beginStage } from "../../kit/cast-core";
import { FAMILY, Mood, stander, crowd, spots, bubbleFx, burst } from "../../kit/cast-kit";
import { SHOTS } from "./story";
import * as S from "./story";

export type { CamInfo, Stage };
const SQUARE = spots(30, 0, -2.25, 16, 9.5);

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  beginStage(s.light, cam);
  switch (s.crowd) {
    case "praca":
      crowd(out, cam, t, SQUARE.slice(0, 14), (i) => (t >= S.T_GANCHO - 0.07 ? (i % 2 ? "shock" : "nervous") : "calm"), () => ({ prop: "phone" }), [S.T_GANCHO]);
      bubbleFx(out, t, S.T_GANCHO - 0.07, "bang", 0.5, 2.9, -3, 1.0);
      break;
    case "familia": {
      const [fx0, , fz0] = S.FAMILY;
      FAMILY.forEach((m, i) => {
        const mood: Mood = t >= S.T_VIRADA - 0.07 ? "happy" : "calm";
        stander(out, cam, t, 1000 + i, m.o, m.key, fx0 + m.dx, fz0 + m.dz, mood, { facing: i === 3 ? -1 : i === 0 ? 1 : 0 }, m.s, [S.T_VIRADA]);
      });
      burst(out, t, S.T_VIRADA, fx0 + 0.2, 1.9, fz0 - 0.2, 2.6);
      break;
    }
  }
  return out;
};
