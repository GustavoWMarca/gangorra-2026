// KIT: cenários. Chão de grama, praça de pedra, morros, árvores e palmeiras, casario em anel virado pra praça com
// janelas que acendem/apagam em 4 grupos (TownLights), postes de luz. Tudo entra num Batch (um mesh por material).
import * as THREE from "three";
import { Batch, V, lam, house } from "./build";
import { cobbleHD, grassHD, stoneHD } from "./paint";
import { NOINK } from "./ink";
import { hh } from "./cast-core";

const D0 = 0;
export type V3 = [number, number, number];
export const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
export const cyl = (r0: number, r1: number, h: number, n = 32) => new THREE.CylinderGeometry(r1, r0, h, n, 1).translate(0, h / 2, 0);
/** multiplica os UVs para a textura repetir n vezes */
export const tiled = (g: THREE.BufferGeometry, n: number) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * n, uv.getY(i) * n); return g; };

/** materiais comuns (cacheados por nome) */
export const mats = () => ({
  grass: lam("grassHD", () => ({ map: grassHD() })),
  cobble: lam("cobbleHD", () => ({ map: cobbleHD() })),
  pave: lam("paveHD", () => ({ map: stoneHD("paveHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") })),
  plinth: lam("plinthHD", () => ({ map: stoneHD("copeHD") })),
  bark: lam("bark", () => ({ color: "#8a5a3c" })),
  leafA: lam("leafA", () => ({ color: "#62ae4c" })),
  leafB: lam("leafB", () => ({ color: "#4f9a43" })),
  palmTrunk: lam("palmTrunk", () => ({ color: "#9a7650" })),
  frond: lam("frond", () => ({ color: "#4f9a43", side: THREE.DoubleSide })),
  iron: lam("ironDark", () => ({ color: "#4e5560" })),
  steel: lam("towerSteel", () => ({ color: "#8a919c" })),
  insul: lam("insulator", () => ({ color: "#b8684a" })),
  wood: lam("tableWood", () => ({ color: "#a8724a" })),
  hills: [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))],
});
export type Mats = ReturnType<typeof mats>;

const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = D0) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
/** grama até o horizonte */
export const ground = (b: Batch, M: Mats) => b.add(quadUp(-900, 900, -900, 900, 450, 450), M.grass);
/** praça redonda de pedra de raio r */
export const cobbleDisc = (b: Batch, M: Mats, r = 36, x = 0, z = 0) => b.add(tiled(new THREE.CircleGeometry(r, 96).rotateX(-Math.PI / 2), r * 0.7), M.cobble, at(x, D0 + 0.02, z));

/** morros como meias-esferas achatadas: [x, z, raio x, altura, raio z] */
export type Hill = readonly [number, number, number, number, number];
export const HILLS_DEFAULT: Hill[] = [[-360, 300, 200, 60, 130], [160, 520, 260, 70, 150], [460, 180, 180, 50, 140], [-480, -60, 200, 46, 150], [520, -120, 170, 44, 130], [220, 480, 140, 26, 100]];
export const hills = (b: Batch, M: Mats, list: Hill[] = HILLS_DEFAULT) =>
  list.forEach(([x, z, sx, sy, sz], i) => b.add(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.hills[i % 3], new THREE.Matrix4().compose(V(x, D0 - 2, z), new THREE.Quaternion(), V(sx, sy, sz))));
/** caixas dos morros para o story.SOLIDS (o verificador acusa câmera dentro de morro) */
export const hillSolids = (list: Hill[] = HILLS_DEFAULT) =>
  list.map(([x, z, sx, sy, sz], i) => ({ name: `morro ${i + 1}`, box: [[x - sx * 0.8, -2, z - sz * 0.8], [x + sx * 0.8, sy * 0.6, z + sz * 0.8]] as [V3, V3] }));

export const tree = (b: Batch, M: Mats, x: number, z: number, s: number, seed: number) => {
  b.add(cyl(0.3 * s, 0.22 * s, 2.8 * s, 8), M.bark, at(x, D0, z));
  b.add(new THREE.IcosahedronGeometry(1.9 * s, 1), seed % 2 ? M.leafA : M.leafB, at(x, D0 + 4.0 * s, z));
  b.add(new THREE.IcosahedronGeometry(1.4 * s, 1), seed % 3 ? M.leafB : M.leafA, at(x + 0.8 * s, D0 + 5.0 * s, z - 0.3 * s));
};
export const palm = (b: Batch, M: Mats, x: number, z: number, s: number) => {
  let px = x, py = D0;
  for (let i = 0; i < 6; i++) { b.add(cyl(0.3 * s, 0.26 * s, 1.5 * s, 8), M.palmTrunk, at(px, py, z)); px += 0.12 * s; py += 1.45 * s; }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, g = new THREE.BoxGeometry(3.4 * s, 0.12 * s, 0.7 * s).translate(1.7 * s, 0, 0);
    b.add(g, M.frond, new THREE.Matrix4().makeTranslation(px, py + 0.2 * s, z).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(-0.45)));
  }
};

/** janelas acesas em 4 grupos (apagam em ordem: set(0..1)); postes entram nos mesmos grupos */
export class TownLights {
  private mats: THREE.MeshBasicMaterial[] = [];
  private batches: Batch[] = [0, 1, 2, 3].map(() => new Batch());
  private on = new THREE.Color(1.9, 1.35, 0.7); private off = new THREE.Color("#2b3049");
  constructor() { for (let g = 0; g < 4; g++) this.mats.push(new THREE.MeshBasicMaterial({ color: this.on.clone(), fog: true })); }
  /** vidros das janelas da fachada (mesmo desenho do facadeHD), ~75 % acesas */
  windows(k: number, x: number, z: number, yaw: number, w: number, d: number, h: number) {
    const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, D0, z), hw = w / 2, hd = d / 2;
    const n = Math.max(1, Math.floor(w / 2.2)), floors = Math.max(1, Math.floor(h / 2.8));
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < n; i++) {
      if (fl === 0 && i === Math.floor(n / 2)) continue;
      if (hh(k * 31 + fl * 7 + i, 3) < 0.25) continue;
      const px = -hw + ((i + 0.5) / n) * w, yb = fl * 2.8 + 0.9;
      this.batches[(k + fl + i) % 4].add(new THREE.PlaneGeometry(0.78, 1.12), this.mats[0], m.clone().multiply(at(px, yb + 0.64, hd + 0.05)));
    }
  }
  bulb(g: number, x: number, y: number, z: number, r = 0.32) { this.batches[g % 4].add(new THREE.SphereGeometry(r, 12, 8), this.mats[0], at(x, y, z)); }
  build(root: THREE.Object3D) {
    this.batches.forEach((bt, i) => { const grp = new THREE.Group(); bt.build(grp, false); grp.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = this.mats[i]; m.receiveShadow = false; m.layers.set(NOINK); } }); root.add(grp); });
  }
  /** 1 = tudo aceso, 0 = tudo apagado; os grupos apagam um depois do outro */
  set(on: number) { this.mats.forEach((m, g) => { const k = Math.max(0, Math.min(1, on * 4 - g)); m.color.copy(this.off).lerp(this.on, k); }); }
}

/** casario em anel virado pro centro, com janelas acesas; skip(x, z) deixa buracos (ruas, a linha de energia…) */
export const townRing = (b: Batch, lights: TownLights | null, o: { r: number; n: number; w?: number; heights?: number[]; start?: number; jitter?: number; seed?: number; skip?: (x: number, z: number) => boolean; firstR?: number }) => {
  const w = o.w ?? 9, hs = o.heights ?? [7, 8.4, 9.8];
  let si = o.seed ?? 1;
  for (let k = 0; k < o.n; k++) {
    const a = (k / o.n) * Math.PI * 2 + (o.start ?? -Math.PI / 2), r = k === 0 && o.firstR ? o.firstR : o.r + (k % 3) * (o.jitter ?? 1.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (o.skip?.(x, z)) continue;
    const h = hs[si % hs.length], yaw = Math.atan2(-x, -z);
    house(b, x, z, yaw, w, 8, h, si); lights?.windows(k + (o.seed ?? 0) * 100, x, z, yaw, w, 8, h); si++;
  }
};
/** postes de luz em círculo (lâmpada nos grupos das janelas) */
export const streetLamps = (b: Batch, M: Mats, lights: TownLights, n = 8, r = 15) => {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + 0.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    b.add(cyl(0.09, 0.07, 4.2, 8), M.iron, at(x, D0, z));
    lights.bulb(k, x, D0 + 4.35, z);
  }
};
