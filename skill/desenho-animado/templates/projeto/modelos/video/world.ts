// __TITULO__ — cenário montado com o kit (src/kit/sets.ts e props.ts). Troque/adicione peças e anime em pose().
import * as THREE from "three";
import { Batch } from "../../kit/build";
import { BaseWorld } from "../../kit/world-base";
import { mats, ground, cobbleDisc, hills, tree, townRing, streetLamps, TownLights } from "../../kit/sets";
import { stage } from "./cast";
import * as S from "./story";

export class World extends BaseWorld {
  private lights = new TownLights();
  constructor() {
    super({ FPS: S.FPS, SHOTS: S.SHOTS, camAt: S.camAt, stage });
    const R = this.root, M = mats(), b = new Batch();
    ground(b, M);
    cobbleDisc(b, M, 36);
    townRing(b, this.lights, { r: 30, firstR: 30, n: 22 });
    townRing(b, this.lights, { r: 44, n: 18, w: 11, heights: [11, 13.5], start: 0.17, jitter: 0, seed: 1 });
    hills(b, M);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.4, x = Math.cos(a) * 20, z = Math.sin(a) * 20; if (z < -14 && Math.abs(x) < 7) continue; tree(b, M, x, z, 1, k); }
    streetLamps(b, M, this.lights, 8, 15);
    b.build(R);
    this.lights.build(R);
  }
  protected pose(_id: number, _t: number) { /* anime aqui o que é do vídeo (ex.: this.lights.set(0..1)) */ }
}
export const newWorld = () => new World() as unknown as { root: THREE.Object3D; update: World["update"] };
