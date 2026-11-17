// O apagão: a cidadezinha ao entardecer montada com o kit (praça, casario com janelas que apagam, postes, morros,
// árvores), a TV de praça, a mesa da família e a linha de torres que cai como dominó.
import * as THREE from "three";
import { Batch } from "../../kit/build";
import { BaseWorld } from "../../kit/world-base";
import { mats, ground, cobbleDisc, hills, tree, townRing, streetLamps, TownLights, HILLS_DEFAULT } from "../../kit/sets";
import { PublicTV, table, PowerLine } from "../../kit/props";
import { hh } from "../../kit/cast-core";
import { stage } from "./cast";
import * as S from "./story";

const inLineGap = (x: number, z: number) => x > 6 && z > 20; // where the power line leaves town

export class World extends BaseWorld {
  private lights = new TownLights();
  private tv: PublicTV;
  private line: PowerLine;

  constructor() {
    super({ FPS: S.FPS, SHOTS: S.SHOTS, camAt: S.camAt, stage, dimAt: (id, t) => S.lightsAt(id, t).dim,
      sunShot: { 2: { az: 30, el: 9 }, 4: { az: 30, el: 9 }, 10: { az: 35, el: 8 }, 5: { az: 25 }, 7: { az: 15, el: 6 } } });
    const R = this.root, M = mats(), b = new Batch();
    ground(b, M);
    cobbleDisc(b, M, 36);
    townRing(b, this.lights, { r: 30, firstR: 30, n: 22, skip: (x, z) => x > 8 && z > 22 });
    townRing(b, this.lights, { r: 44, n: 18, w: 11, heights: [11, 13.5], start: 0.17, jitter: 0, seed: 1, skip: inLineGap });
    hills(b, M, HILLS_DEFAULT);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.4, tx = Math.cos(a) * 20, tz = Math.sin(a) * 20; if (k === 2 || (tz < -14 && Math.abs(tx) < 7)) continue; tree(b, M, tx, tz, 1, k); }
    for (let k = 0; k < 16; k++) tree(b, M, (k % 2 ? 4 : 28) + hh(k, 5) * 4, 60 + k * 11 + hh(k, 2) * 4, 1.1 + hh(k) * 0.4, k);
    streetLamps(b, M, this.lights, 8, 15);
    this.tv = new PublicTV(b, M, R, S.TV, S.TV_Y);
    table(b, M, S.TABLE, 0.8, 0.45, 0.9);
    b.build(R);
    this.lights.build(R);
    this.line = new PowerLine(R, M, Array.from({ length: S.N_TOWERS }, (_, i) => S.towerPos(i)), S.TOWER_H);
  }

  protected pose(id: number, t: number) {
    this.line.pose((i) => S.towerFall(id, t, i));
    const { on } = S.lightsAt(id, t);
    this.lights.set(on);
    // TV: alert from "alarme" in shot 3; in shot 6 the test beep (alert) then bars; off when the town is dark
    this.tv.show(id === 3 ? (t >= S.T_ALARME - 0.1 ? "alert" : "bars") : id === 6 ? (t >= S.T_SORTE && t < S.T_APITO + 1.6 ? "alert" : "bars") : on < 0.5 ? "off" : "bars");
  }
}
export const newWorld = () => new World() as unknown as { root: THREE.Object3D; update: World["update"] };
