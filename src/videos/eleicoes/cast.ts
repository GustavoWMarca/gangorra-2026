// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, INK } from "./toon";
import {
  FPS, D0, SHOTS, smooth, clamp01, tiltAt, onSeesaw, PLAT,
  T_GANHOU, T_FRENTE, T_NINGUEM, T_QUEM, T_LADO, T_FEZ,
} from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = { 1: [T_GANHOU], 3: [T_FRENTE], 6: [T_LADO] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };


// ---------------- elections cast ----------------
const SK = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#a8714f"];
const HAIRS = ["#5a3b2a", "#2a201a", "#c9893a", "#4a3020", "#1d1714"];
const RED_TEES = ["#d0453c", "#b8343a", "#e05a48", "#c23b44"];
const BLUE_TEES = ["#3f6fb5", "#2f5f9a", "#4b7fc8", "#35609e"];
const GREY_TEES = ["#c8c4bb", "#a9a9a4", "#e8e6e0", "#8d9096"];
const fan = (side: number, v: number): Outfit => ({
  jacket: (side > 0 ? RED_TEES : side < 0 ? BLUE_TEES : GREY_TEES)[v % 4], pants: ["#3b5b9a", "#3b3f52", "#d9c7a0", "#5b4a3a"][(v * 3) % 4],
  boots: ["#f4f1ea", "#4a3426", "#2a201a"][v % 3], hat: v % 5 === 3 ? "cap" : "hair", cap: side > 0 ? "#f4f1ea" : side < 0 ? "#f4f1ea" : "#e8dcc0",
  hair: HAIRS[v % 5], skin: SK[(v * 7 + 2) % 5], build: v % 7 === 4 ? "stout" : undefined,
});
/** the two candidates: dark suits; the red-side one older, grey hair and beard-ish grey moustache */
const CAND_RED: Outfit = { jacket: "#3a3f55", pants: "#2e3244", boots: "#1d1714", hat: "hair", hair: "#d9d6cf", moustache: "#d9d6cf", skin: "#f0c8a0", build: "stout", buttons: "#c0443c" };
const CAND_BLUE: Outfit = { jacket: "#3a3f55", pants: "#2e3244", boots: "#1d1714", hat: "hair", hair: "#3a2a20", skin: "#ffe2c2", buttons: "#3f6fb5" };

type Mood = "happy" | "sad" | "calm" | "tense";
const moodOf = (id: number, t: number, side: number): Mood => {
  const L = (w: number) => t >= w - LEAD;
  switch (id) {
    case 1: return L(T_GANHOU) ? (side > 0 ? "happy" : "sad") : (side > 0 ? "sad" : "happy");
    case 2: return "calm";
    case 3: return L(T_FRENTE) ? (side > 0 ? "tense" : "happy") : "calm";
    case 4: return "tense";
    case 5: return "calm";
    case 6: return L(T_LADO) ? (side > 0 ? "happy" : "sad") : "calm";
    default: return side > 0 ? "happy" : "sad";
  }
};
/** when the mood last changed (for the shock beat right after a loss) */
const swapAt = (id: number) => (id === 1 ? T_GANHOU : id === 3 ? T_FRENTE : id === 6 ? T_LADO : -9);
const exprOf = (m: Mood, i: number, t: number, id: number): Expr => {
  if (m === "happy") return (["laugh", "grin", "laugh", "relief_open"] as Expr[])[i % 4];
  if (m === "sad") return t - swapAt(id) < 0.9 ? "shock" : (["nervous", "pained", "nervous", "stern"] as Expr[])[i % 4];
  if (m === "tense") return (["nervous", "stern", "nervous", "neutral"] as Expr[])[i % 4];
  return (["smile", "neutral", "smile_closed", "neutral"] as Expr[])[i % 4];
};

const ROWS: [number, number][] = [[4.3, -0.9], [5.8, -0.7], [7.3, -1.0], [4.7, 0.6], [6.2, 0.8], [7.5, 0.5], [4.4, 1.9], [5.9, 2.1], [7.2, 1.8]];
const CAND_AT: [number, number] = [5.8, -2.0];

/** supporters + candidate standing on one platform, riding the tilt */
const platform = (cam: CamInfo, id: number, t: number, out: Stage, side: number, withCand = true) => {
  const tilt = tiltAt(id, t), m = moodOf(id, t, side);
  ROWS.forEach(([lx, lz], i) => {
    const v = i + (side > 0 ? 0 : 11), hop = m === "happy" ? Math.max(0, Math.sin(t * 9 + i * 1.7)) * 0.22 : 0;
    const [x, y, z] = onSeesaw(side * lx, PLAT.top, lz, tilt);
    const who: Who = { i: 600 + v, o: fan(side, v), okey: `fan${side}_${v}` };
    const wave = m === "happy" ? q(Math.sin(t * 10 + i * 1.3), 30) : undefined;
    const fo: FrontOpts = { mode: "stand", expr: exprOf(m, i, t, id), wave, blink: lidAt(t, 600 + v, SWAPS[id]), look: m === "tense" ? (i % 2 ? 1 : -1) : 0 };
    out.places.push(person(cam, who, x, y + hop, z, { side: false, mirror: false }, fo, {}));
    blob(out, x, y + 0.04, z, 1, hop > 0.05 ? 0.6 : 1);
  });
  if (!withCand) return;
  const [x, y, z] = onSeesaw(side * CAND_AT[0], PLAT.top, CAND_AT[1], tilt);
  const o = side > 0 ? CAND_RED : CAND_BLUE, who: Who = { i: side > 0 ? 700 : 701, o, okey: side > 0 ? "candR" : "candB" };
  const wave = m === "happy" ? q(0.5 + 0.5 * Math.sin(t * 6), 30) : undefined;
  const expr: Expr = m === "happy" ? (side > 0 ? "laugh" : "grin") : m === "sad" ? (t - swapAt(id) < 0.9 ? "shock" : "stern") : m === "tense" ? "nervous" : "smile";
  const cake = id === 8 && t >= T_FEZ - LEAD;
  const fo: FrontOpts = { mode: "stand", expr: cake ? "relief" : expr, wave: cake ? undefined : wave, blink: lidAt(t, who.i, SWAPS[id]), facing: side > 0 ? -1 : 1 };
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}));
  blob(out, x, y + 0.04, z);
  if (id === 8) cakeFx(out, t, x, y, z);
};

/** the 11 grey voters (the other candidates' voters) in front of the pivot; in the runoff they pick a side */
const GREY: [number, number][] = [[-2.6, -4.7], [-2.08, -3.8], [-1.56, -4.8], [-1.04, -3.7], [-0.52, -4.6], [0, -3.8], [0.52, -4.8], [1.04, -3.7], [1.56, -4.7], [2.08, -3.8], [2.6, -4.8]];
const GOES: number[] = [-1, -1, 1, -1, -1, 1, -1, 1, 1, 1, 1];
const dest = (i: number): [number, number] => {
  const s = GOES[i], k = GOES.slice(0, i).filter((g) => g === s).length;
  return s > 0 ? [3.4 + k * 0.9, -3.9 - (k % 2) * 0.8] : [-3.4 - k * 1.0, -3.8 - (k % 2) * 0.8];
};
const greys = (cam: CamInfo, id: number, t: number, out: Stage) => {
  GREY.forEach(([x0, z0], i) => {
    const [x1, z1] = dest(i), who: Who = { i: 800 + i, o: fan(0, i), okey: `grey${i}` };
    const t0 = T_QUEM - 0.6 + (i % 4) * 0.07, dur = 2.5;
    let u = 0;
    if (id === 6) u = clamp01((t - t0) / dur);
    if (id >= 7) u = 1;
    const k = smooth(u), x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k;
    const moving = u > 0 && u < 1;
    if (moving) {
      const dx = Math.sign(x1 - x0) || 1, view = viewOf(cam, x, z, dx, 0), trav = Math.abs(x - x0);
      const ph = ((trav / 1.4) % 1 + 1) % 1;
      const fo: FrontOpts = { phase: ph, mode: "march", expr: "grin", blink: lidAt(t, 800 + i) };
      const so: SideOpts = { phase: ph, mode: "march", expr: "grin", blink: lidAt(t, 800 + i), stomp: 1.2, stride: view.fs };
      out.places.push(person(cam, who, x, D0, z, view, fo, so));
    } else {
      const side = u >= 1 ? GOES[i] : 0;
      const m: Mood = side ? moodOf(id, t, side) : id === 4 ? "tense" : "calm";
      const shrug = id === 4 ? q(Math.sin(t * 5 + i), 20) * 0.3 - 0.4 : undefined;
      const hop = m === "happy" ? Math.max(0, Math.sin(t * 8 + i * 2.1)) * 0.2 : 0;
      const fo: FrontOpts = { mode: "stand", expr: exprOf(m, i + 1, t, id), wave: m === "happy" ? q(Math.sin(t * 9 + i), 30) : shrug, blink: lidAt(t, 800 + i), look: id === 4 ? (i % 3) - 1 : 0 };
      out.places.push(person(cam, who, x, D0 + hop, z, { side: false, mirror: false }, fo, {}));
    }
    blob(out, x, D0, z);
  });
};

/** 4 de outubro: people strolling in front of the giant ballot box */
const strollers = (cam: CamInfo, t: number, out: Stage) => {
  for (let i = 0; i < 14; i++) {
    const dir = i % 2 ? 1 : -1, z = 2.2 + (i % 5) * 1.1 + hh(i) * 0.4, sp = 1.05 + hh(i, 3) * 0.3;
    const span = 26, x = -46 + ((((hh(i, 5) * span + dir * sp * t) % span) + span) % span);
    const view = viewOf(cam, x, z, dir, 0), ph = (((sp * t) / 1.6 + hh(i, 7)) % 1 + 1) % 1;
    const side = i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0;
    const who: Who = { i: 900 + i, o: fan(side, i + 3), okey: `st${i}` };
    const expr: Expr = (["smile", "neutral", "whistle", "smile_closed"] as Expr[])[i % 4];
    const fo: FrontOpts = { phase: ph, mode: "stroll", expr, blink: lidAt(t, 900 + i) };
    const so: SideOpts = { phase: ph, mode: "march", expr, blink: lidAt(t, 900 + i), stomp: 0.7, stride: view.fs * 0.8 };
    out.places.push(person(cam, who, x, D0, z, view, fo, so));
    blob(out, x, D0, z);
  }
};

// ---------------- effects ----------------
const burst = (out: Stage, t: number, t0: number, x: number, y: number, z: number, s = 3.4) => {
  if (t < t0 || t >= t0 + 0.4) return;
  const u = q((t - t0) / 0.4, 30);
  out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y, z, w: s, h: s });
};
const CONF = ["#e2453c", "#f3d35a", "#3f9a4f", "#f4f1ea", "#f08a2c", "#7b5ac9"];
const confetti = (out: Stage, t: number, t0: number, cx: number, cy: number) => {
  if (t < t0) return;
  for (let i = 0; i < 44; i++) {
    const col = CONF[i % 6], fall = 1.1 + hh(i, 2) * 0.6, life = 5.5;
    const age = ((t - t0 + hh(i, 4) * life) % life);
    const x = cx + (hh(i, 6) - 0.5) * 5 + 0.35 * Math.sin(t * 3 + i), y = cy + 6.5 - age * fall, z = -5 + hh(i, 8) * 6;
    if (y < D0 + 0.2) continue;
    out.fx.push({ key: `conf|${col}`, cw: 64, ch: 40, draw: (p) => { p.poly([[4, 4], [60, 4], [60, 36], [4, 36]], col, 5); }, x, y, z, w: 0.2, h: 0.125, rot: t * (2 + hh(i, 9) * 4) + i });
  }
};
/** birthday cake with "8" and "1" number candles, held in front of the candidate */
const cakeFx = (out: Stage, t: number, x: number, y: number, z: number) => {
  if (t < T_FEZ - LEAD) return;
  const pop = clamp01((t - T_FEZ + LEAD) / 0.25), fl = Math.floor(t * 12) % 3;
  out.fx.push({
    key: `cake${fl}`, cw: 600, ch: 600, x: x + 0.05, y: y + 0.95, z: z - 0.45, w: 0.95 * (0.6 + 0.4 * pop), h: 0.95 * (0.6 + 0.4 * pop),
    draw: (p) => {
      p.ell(300, 520, 250, 46, "#f4f1ea", 10);
      p.poly([[90, 500], [90, 360], [510, 360], [510, 500]], "#f2b8c6", 10);
      p.poly([[90, 360], [510, 360], [510, 392], [90, 392]], "#fff6ea", 6);
      for (let k = 0; k < 7; k++) p.ell(120 + k * 60, 392, 18, 24, "#fff6ea", 0, 0, 180);
      p.poly([[150, 360], [150, 260], [450, 260], [450, 360]], "#c8784e", 10);
      p.poly([[150, 260], [450, 260], [450, 286], [150, 286]], "#fff6ea", 6);
      const g = p.g;
      for (const [ch, cx] of [["8", 245], ["1", 355]] as const) {
        g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
        g.lineWidth = 16; g.strokeStyle = INK; g.strokeText(ch, cx, 258); g.fillStyle = "#f3d35a"; g.fillText(ch, cx, 258);
        p.stroke([[cx, 140], [cx, 118]], 6);
        const h = 34 + fl * 6;
        p.poly([[cx, 118 - h], [cx + 14, 104], [cx, 122], [cx - 14, 104]], "#ffb347", 4);
      }
    },
  });
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (s.crowd === "voters") { strollers(cam, t, out); return out; }
  platform(cam, id, t, out, -1);
  platform(cam, id, t, out, 1);
  if (id !== 1 && id !== 8) greys(cam, id, t, out);
  const tilt = tiltAt(id, t), rp = onSeesaw(5.8, PLAT.top, -2.6, tilt), bp = onSeesaw(-5.8, PLAT.top, -2.6, tilt);
  if (id === 1) burst(out, t, T_GANHOU, rp[0], rp[1] + 0.3, rp[2], 4);
  if (id === 3) burst(out, t, T_FRENTE, bp[0], bp[1] + 0.3, bp[2], 4);
  if (id === 6) burst(out, t, T_LADO, rp[0], rp[1] + 0.3, rp[2], 4);
  if (id === 4) burst(out, t, T_NINGUEM + 0.1, 0, 2.9, -1.3, 2.0);
  if (id === 7) confetti(out, t, s.a / FPS, rp[0], rp[1]);
  if (id === 8) confetti(out, t, s.a / FPS - 3, rp[0], rp[1]);
  return out;
};
export { FPS, smooth, clamp01 };
