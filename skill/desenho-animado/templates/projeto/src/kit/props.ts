// KIT: objetos. TV de praça num poste (telas: alerta, barras, desligada), mesa, linha de torres de energia que cai
// como dominó (com os cabos acompanhando), gangorra gigante com dois palanques, urna eletrônica gigante.
import * as THREE from "three";
import { Batch, boxGeo, V, lam } from "./build";
import { ctex, planksHD, rep } from "./paint";
import { NOINK } from "./ink";
import { Mats, at, cyl } from "./sets";

const D0 = 0;
export type V3 = [number, number, number];

// ---------------- TV de praça ----------------
const tvAlert = () => ctex("tvAlert", 512, 320, (g) => {
  g.fillStyle = "#c8323a"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#f4f1ea"; for (let i = 0; i < 6; i++) { g.save(); g.translate(i * 110 - 60, 0); g.transform(1, 0, -0.5, 1, 0, 0); g.fillRect(0, 0, 40, 320); g.restore(); }
  g.fillStyle = "#c8323a"; g.fillRect(140, 70, 232, 180);
  g.fillStyle = "#ffd84a"; g.strokeStyle = "#241726"; g.lineWidth = 10;
  g.beginPath(); g.arc(256, 190, 62, Math.PI, 0); g.lineTo(318, 210); g.lineTo(194, 210); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#241726"; g.fillRect(180, 210, 152, 24);
  g.strokeStyle = "#ffd84a"; g.lineWidth = 10; g.lineCap = "round";
  for (const a of [-2.4, -1.57, -0.74]) { g.beginPath(); g.moveTo(256 + Math.cos(a) * 80, 175 + Math.sin(a) * 80); g.lineTo(256 + Math.cos(a) * 114, 175 + Math.sin(a) * 114); g.stroke(); }
});
const tvBars = () => ctex("tvBars", 512, 320, (g) => {
  ["#f4f1ea", "#f3d35a", "#5ec8d8", "#62ae4c", "#c25a9a", "#d0453c", "#3f6fb5"].forEach((col, i) => { g.fillStyle = col; g.fillRect((i * 512) / 7, 0, 512 / 7 + 1, 240); });
  g.fillStyle = "#241726"; g.fillRect(0, 240, 512, 80);
  g.fillStyle = "#f4f1ea"; for (let i = 0; i < 4; i++) g.fillRect(40 + i * 120, 262, 70, 36);
});
const tvOff = () => ctex("tvOff", 64, 40, (g) => { g.fillStyle = "#1c2030"; g.fillRect(0, 0, 64, 40); });
export type TvScreen = "alert" | "bars" | "off";
/** TV num poste; a tela olha pra -z. show() troca a imagem */
export class PublicTV {
  private mat: THREE.MeshBasicMaterial; private tex: Record<TvScreen, THREE.Texture>;
  constructor(b: Batch, M: Mats, root: THREE.Object3D, pos: V3, y: number) {
    b.add(cyl(0.16, 0.14, y - 1.0, 10), M.iron, at(pos[0], D0, pos[2] + 0.3));
    b.add(boxGeo(V(pos[0] - 1.9, y - 1.25, pos[2] - 0.1), V(pos[0] + 1.9, y + 1.25, pos[2] + 0.5)), lam("tvBody", () => ({ color: "#2e3244" })));
    this.tex = { alert: tvAlert(), bars: tvBars(), off: tvOff() };
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex.bars, color: new THREE.Color(1.5, 1.5, 1.5) });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.15).rotateY(Math.PI), this.mat);
    scr.position.set(pos[0], y, pos[2] - 0.12); scr.layers.set(NOINK); root.add(scr);
  }
  show(s: TvScreen) { this.mat.map = this.tex[s]; }
}

// ---------------- mesa ----------------
export const table = (b: Batch, M: Mats, pos: V3, halfW = 0.8, halfD = 0.45, h = 0.9) => {
  b.add(boxGeo(V(pos[0] - halfW, D0 + h - 0.08, pos[2] - halfD), V(pos[0] + halfW, D0 + h, pos[2] + halfD)), M.wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = pos[0] + sx * (halfW - 0.1), lz = pos[2] + sz * (halfD - 0.08);
    b.add(boxGeo(V(lx - 0.05, D0, lz - 0.05), V(lx + 0.05, D0 + h - 0.08, lz + 0.05)), M.wood);
  }
};

// ---------------- linha de transmissão ----------------
/** torres de energia em fila; pose(fall) inclina cada uma em direção a -z pelo pé (graus) e os cabos acompanham */
export class PowerLine {
  private towers: THREE.Group[] = [];
  private cables: { mesh: THREE.Mesh; a: [number, V3]; b: [number, V3] }[] = [];
  constructor(root: THREE.Object3D, M: Mats, private pos: V3[], private H = 22) {
    for (let i = 0; i < pos.length; i++) {
      const tb = new Batch(), g = new THREE.Group();
      tb.add(new THREE.CylinderGeometry(0.7, 3.0, H, 4, 1).rotateY(Math.PI / 4).translate(0, H / 2, 0), M.steel);
      tb.add(boxGeo(V(-6.0, H * 0.74, -0.3), V(6.0, H * 0.74 + 0.6, 0.3)), M.steel);
      tb.add(boxGeo(V(-4.4, H * 0.91, -0.28), V(4.4, H * 0.91 + 0.55, 0.28)), M.steel);
      tb.add(new THREE.ConeGeometry(0.5, 1.6, 4).rotateY(Math.PI / 4).translate(0, H + 0.8, 0), M.steel);
      for (const [x, y] of [[-5.6, H * 0.74], [5.6, H * 0.74], [-4.0, H * 0.91], [4.0, H * 0.91]]) tb.add(cyl(0.18, 0.18, 0.9, 8), M.insul, at(x, y - 0.9, 0));
      tb.build(g); g.matrixAutoUpdate = false;
      this.towers.push(g); root.add(g);
    }
    const tips: V3[] = [[-5.6, H * 0.74 - 0.9, 0], [5.6, H * 0.74 - 0.9, 0], [-4.0, H * 0.91 - 0.9, 0], [4.0, H * 0.91 - 0.9, 0]];
    const cg = new THREE.CylinderGeometry(0.09, 0.09, 1, 5), cm = new THREE.MeshBasicMaterial({ color: "#2a2833" });
    for (let i = 0; i + 1 < pos.length; i++) for (const tp of tips) {
      const mesh = new THREE.Mesh(cg, cm); mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
      this.cables.push({ mesh, a: [i, tp], b: [i + 1, tp] }); root.add(mesh);
    }
  }
  pose(fallDeg: (i: number) => number) {
    const mats = this.pos.map(([x, y, z], i) => new THREE.Matrix4().makeTranslation(x, y, z - 2.0)
      .multiply(new THREE.Matrix4().makeRotationX(-THREE.MathUtils.degToRad(fallDeg(i)))).multiply(new THREE.Matrix4().makeTranslation(0, 0, 2.0)));
    mats.forEach((m, i) => { this.towers[i].matrix.copy(m); this.towers[i].matrixWorldNeedsUpdate = true; });
    const pa = new THREE.Vector3(), pb = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
    for (const c of this.cables) {
      pa.set(...c.a[1]).applyMatrix4(mats[c.a[0]]); pb.set(...c.b[1]).applyMatrix4(mats[c.b[0]]);
      const d = pb.clone().sub(pa), L = d.length();
      q.setFromUnitVectors(up, d.normalize());
      c.mesh.matrix.compose(pa.clone().add(pb).multiplyScalar(0.5), q, new THREE.Vector3(1, L, 1)); c.mesh.matrixWorldNeedsUpdate = true;
    }
  }
}

// ---------------- gangorra gigante ----------------
export type SeesawDims = { pivotY: number; half: number; plat: { x0: number; x1: number; top: number; z0: number; z1: number } };
export const SEESAW_DEFAULT: SeesawDims = { pivotY: 2.0, half: 8.0, plat: { x0: 3.6, x1: 8.0, top: 2.4, z0: -2.6, z1: 2.6 } };
/** gangorra no centro (0,0,0), viga ao longo de x, palanque azul em -x e vermelho em +x; pose(graus, + = lado +x desce) */
export class Seesaw {
  private g = new THREE.Group();
  constructor(root: THREE.Object3D, M: Mats, private d: SeesawDims = SEESAW_DEFAULT) {
    const { pivotY: PY, half, plat } = d, sb = new Batch();
    for (const z of [-1.7, 1.7]) sb.add(new THREE.CylinderGeometry(0.05, 1.9, PY - 0.3, 3, 1).rotateY(Math.PI / 6).scale(1, 1, 0.25).translate(0, (PY - 0.3) / 2, 0), M.iron, at(0, D0, z));
    sb.add(new THREE.CylinderGeometry(0.45, 0.45, 4.2, 20).rotateX(Math.PI / 2), M.iron, at(0, PY - 0.25, 0));
    sb.add(boxGeo(V(-2.4, D0, -2.6), V(2.4, D0 + 0.35, 2.6), 2), M.plinth);
    sb.build(root);
    const blue = lam("platBlue", () => ({ color: "#3f6fb5" })), red = lam("platRed", () => ({ color: "#c0443c" })), trim = lam("platTrim", () => ({ color: "#efe3c8" }));
    const wood = lam("planksBeam", () => ({ map: rep(planksHD(), 4, 1) }));
    const mb = new Batch();
    mb.add(boxGeo(V(-half, PY - 0.25, -1.1), V(half, PY + 0.35, 1.1), 2), wood);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -plat.x1 : plat.x0, x1 = s < 0 ? -plat.x0 : plat.x1;
      mb.add(boxGeo(V(x0, plat.top - 0.7, plat.z0), V(x1, plat.top, plat.z1)), s < 0 ? blue : red);
      mb.add(boxGeo(V(x0 - 0.08, plat.top - 0.12, plat.z0 - 0.08), V(x1 + 0.08, plat.top + 0.02, plat.z1 + 0.08)), trim);
      mb.add(boxGeo(V(x0, plat.top + 0.95, plat.z1 - 0.12), V(x1, plat.top + 1.07, plat.z1)), trim);
      for (let i = 0; i <= 4; i++) { const x = x0 + ((x1 - x0) * i) / 4; mb.add(boxGeo(V(x - 0.06, plat.top, plat.z1 - 0.12), V(x + 0.06, plat.top + 1.0, plat.z1)), trim); }
      const xi = s < 0 ? x1 : x0;
      mb.add(boxGeo(V(xi - 0.09, plat.top, -0.09), V(xi + 0.09, plat.top + 1.5, 0.09)), M.iron);
    }
    mb.build(this.g); this.g.matrixAutoUpdate = false; root.add(this.g);
  }
  pose(tiltDeg: number) {
    const PY = this.d.pivotY;
    this.g.matrix.makeTranslation(0, PY, 0).multiply(new THREE.Matrix4().makeRotationZ(-THREE.MathUtils.degToRad(tiltDeg))).multiply(new THREE.Matrix4().makeTranslation(0, -PY, 0));
    this.g.matrixWorldNeedsUpdate = true;
  }
  /** ponto local da gangorra -> mundo (para pôr gente em cima dos palanques) */
  static on(lx: number, ly: number, lz: number, tiltDeg: number, d: SeesawDims = SEESAW_DEFAULT): V3 {
    const p = (-tiltDeg * Math.PI) / 180, c = Math.cos(p), s = Math.sin(p), y = ly - d.pivotY;
    return [lx * c - y * s, d.pivotY + lx * s + y * c, lz];
  }
}

// ---------------- urna eletrônica gigante ----------------
const urnaFace = () => ctex("urnaFace", 1024, 640, (g) => {
  g.fillStyle = "#d9cfba"; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "rgba(60,50,45,.55)"; g.lineWidth = 10; g.strokeRect(20, 20, 984, 600);
  g.fillStyle = "#3a3f4a"; g.fillRect(70, 90, 520, 400); g.fillStyle = "#e9efe8"; g.fillRect(95, 115, 470, 350);
  g.fillStyle = "#c9d3cf"; g.fillRect(120, 150, 180, 220);
  g.fillStyle = "#b9c4c0"; for (let i = 0; i < 4; i++) g.fillRect(330, 160 + i * 52, 200 - i * 30, 22);
  g.fillStyle = "#4a4742"; g.fillRect(650, 90, 300, 470);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    if (r === 3 && c !== 1) continue;
    const x = 680 + c * 90, y = 115 + r * 80;
    g.fillStyle = "#1f1d1c"; g.fillRect(x, y, 70, 58);
    g.fillStyle = "#f2efe8"; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(r === 3 ? 0 : r * 3 + c + 1), x + 35, y + 31);
  }
  ([["#f4f1ea", 672], ["#e8873a", 764], ["#3f9a4f", 856]] as const).forEach(([c, x]) => { g.fillStyle = c; g.fillRect(x, 448, 82, 82); g.strokeStyle = "#1f1d1c"; g.lineWidth = 5; g.strokeRect(x, 448, 82, 82); });
});
/** urna gigante num pedestal, frente virada pra -z */
export const urna = (b: Batch, M: Mats, x: number, z: number) => {
  b.add(boxGeo(V(x - 5.2, D0, z - 2.8), V(x + 5.2, D0 + 0.7, z + 2.8), 2), M.plinth);
  b.add(boxGeo(V(x - 4.5, D0 + 0.7, z - 2), V(x + 4.5, D0 + 6.3, z + 2)), lam("urnaBody", () => ({ color: "#d9cfba" })));
  b.add(new THREE.PlaneGeometry(8.6, 5.375).rotateY(Math.PI), lam("urnaFace", () => ({ map: urnaFace() })), at(x, D0 + 3.5, z - 2.02));
};
