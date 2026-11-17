// A praça: calçamento de pedra, grama, casario colorido em volta, árvores, uma urna eletrônica gigante e a gangorra
// gigante no meio (viga + dois palanques, azul à esquerda e vermelho à direita), inclinada por quadro (story.tiltAt).
// Céu, luzes, nuvens e os cartões dos bonecos funcionam igual aos exemplos.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, house, Kit } from "./build";
import { ctex, cobbleHD, grassHD, cloudHD, stoneHD, planksHD, rep } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, D0, SHOTS, camAt, ShotDef, V3, tiltAt, PIVOT_Y, BEAM_HALF, PLAT } from "./story";

export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 115 }, 2: { az: 120 }, 3: { az: 110 }, 4: { az: 125 }, 6: { az: 125 }, 7: { az: 115 }, 5: { el: 8 }, 8: { az: 40, el: 9 } };

const quadUp = (x0: number, x1: number, z0: number, z1: number, u: number, v: number, y = D0) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
const cyl = (r0: number, r1: number, h: number, n = 32) => new THREE.CylinderGeometry(r1, r0, h, n, 1).translate(0, h / 2, 0);
/** scale a geometry's UVs so its texture repeats n times */
const tiled = (g: THREE.BufferGeometry, n: number) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * n, uv.getY(i) * n); return g; };
const at = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);

/** the front of the giant ballot box: screen on the left, keypad on the right */
const urnaFace = () => ctex("urnaFace", 1024, 640, (g) => {
  g.fillStyle = "#d9cfba"; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "rgba(60,50,45,.55)"; g.lineWidth = 10; g.strokeRect(20, 20, 984, 600);
  // screen
  g.fillStyle = "#3a3f4a"; g.fillRect(70, 90, 520, 400);
  g.fillStyle = "#e9efe8"; g.fillRect(95, 115, 470, 350);
  g.fillStyle = "#c9d3cf"; g.fillRect(120, 150, 180, 220);
  g.fillStyle = "#b9c4c0"; for (let i = 0; i < 4; i++) g.fillRect(330, 160 + i * 52, 200 - i * 30, 22);
  // keypad
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

const tree = (b: Batch, x: number, z: number, s: number, M: Record<string, THREE.Material>, seed: number) => {
  b.add(cyl(0.35 * s, 0.25 * s, 3.2 * s, 8), M.bark, at(x, D0, z));
  b.add(new THREE.IcosahedronGeometry(2.2 * s, 1), seed % 2 ? M.leafA : M.leafB, at(x, D0 + 4.6 * s, z));
  b.add(new THREE.IcosahedronGeometry(1.6 * s, 1), seed % 3 ? M.leafB : M.leafA, at(x + 0.9 * s, D0 + 5.8 * s, z - 0.4 * s));
};
/** a simple palm: leaning trunk segments + drooping fronds */
const palm = (b: Batch, x: number, z: number, s: number, M: Record<string, THREE.Material>) => {
  let px = x, py = D0;
  for (let i = 0; i < 6; i++) { b.add(cyl(0.3 * s, 0.26 * s, 1.5 * s, 8), M.palmTrunk, at(px, py, z)); px += 0.12 * s; py += 1.45 * s; }
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2, g = new THREE.BoxGeometry(3.4 * s, 0.12 * s, 0.7 * s).translate(1.7 * s, 0, 0);
    const m = new THREE.Matrix4().makeTranslation(px, py + 0.2 * s, z).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(-0.45));
    b.add(g, M.frond, m);
  }
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private seesaw = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root, M: Record<string, THREE.Material> = {};
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 140 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 90 + (i % 4) * 40, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- materials ----
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.pave = lam("paveHD", () => ({ map: stoneHD("paveHD", ["#e6dccd", "#ddd3c3", "#ece4d6", "#d6cbba"], "#aea293") }));
    M.bark = lam("bark", () => ({ color: "#8a5a3c" }));
    M.leafA = lam("leafA", () => ({ color: "#62ae4c" }));
    M.leafB = lam("leafB", () => ({ color: "#4f9a43" }));
    M.palmTrunk = lam("palmTrunk", () => ({ color: "#9a7650" }));
    M.frond = lam("frond", () => ({ color: "#4f9a43", side: THREE.DoubleSide }));
    M.wood = lam("planksHD", () => ({ map: rep(planksHD(), 4, 1) }));
    M.iron = lam("ironDark", () => ({ color: "#4e5560" }));
    M.blue = lam("platBlue", () => ({ color: "#3f6fb5" }));
    M.red = lam("platRed", () => ({ color: "#c0443c" }));
    M.trim = lam("platTrim", () => ({ color: "#efe3c8" }));
    M.urna = lam("urnaBody", () => ({ color: "#d9cfba" }));
    M.urnaFace = lam("urnaFace", () => ({ map: urnaFace() }));
    M.plinth = lam("plinthHD", () => ({ map: stoneHD("copeHD") }));
    const hm = [lam("hillA", () => ({ color: "#78b257" })), lam("hillB", () => ({ color: "#6aa24e" })), lam("hillC", () => ({ color: "#8bbf63" }))];

    // ---- static square ----
    const b = new Batch();
    b.add(quadUp(-900, 900, -900, 900, 450, 450), M.grass);
    b.add(tiled(new THREE.CircleGeometry(44, 96).rotateX(-Math.PI / 2), 30), M.cobble, at(0, D0 + 0.02, 0));
    b.add(tiled(new THREE.CircleGeometry(5, 48).rotateX(-Math.PI / 2), 3), M.pave, at(0, D0 + 0.03, 0));
    // houses all around, facing the square
    let hs = 1;
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 2, r = 54 + (k % 3) * 1.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
      house(b, x, z, Math.atan2(-x, -z), 10, 8, [7, 8.4, 9.8][hs % 3], hs); hs++;
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + 0.13, r = 70, x = Math.cos(a) * r, z = Math.sin(a) * r;
      house(b, x, z, Math.atan2(-x, -z), 12, 8, 11 + (hs % 2) * 2.5, hs); hs++;
    }
    ([[-360, 300, 200, 60, 130], [160, 420, 260, 70, 150], [460, 180, 180, 50, 140], [-480, -60, 200, 46, 150], [520, -120, 170, 44, 130]] as const)
      .forEach(([x, z, sx, sy, sz], i) => b.add(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), hm[i % 3], new THREE.Matrix4().compose(V(x, D0 - 2, z), new THREE.Quaternion(), V(sx, sy, sz))));
    // trees and palms on the edge of the square
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2 + 0.07, r = 46.5, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (k % 3 === 0) palm(b, x, z, 1.1, M); else tree(b, x, z, 1.0 + (k % 3) * 0.15, M, k);
    }
    // the giant electronic ballot box on a plinth (front faces -z)
    const ux = -34, uz = 14;
    b.add(boxGeo(V(ux - 5.2, D0, uz - 2.8), V(ux + 5.2, D0 + 0.7, uz + 2.8), 2), M.plinth);
    b.add(boxGeo(V(ux - 4.5, D0 + 0.7, uz - 2), V(ux + 4.5, D0 + 6.3, uz + 2)), M.urna);
    b.add(new THREE.PlaneGeometry(8.6, 5.375).rotateY(Math.PI), M.urnaFace, at(ux, D0 + 3.5, uz - 2.02));
    b.build(R);

    // ---- the seesaw ----
    // pivot stand (static): two A-frames + hub
    const sb = new Batch();
    for (const z of [-1.7, 1.7]) {
      const g = new THREE.CylinderGeometry(0.05, 1.9, PIVOT_Y - 0.3, 3, 1).rotateY(Math.PI / 6).scale(1, 1, 0.25).translate(0, (PIVOT_Y - 0.3) / 2, 0);
      sb.add(g, M.iron, at(0, D0, z));
    }
    sb.add(new THREE.CylinderGeometry(0.45, 0.45, 4.2, 20).rotateX(Math.PI / 2), M.iron, at(0, PIVOT_Y - 0.25, 0));
    sb.add(boxGeo(V(-2.4, D0, -2.6), V(2.4, D0 + 0.35, 2.6), 2), M.plinth);
    sb.build(R);
    // moving part: beam + two platforms with rails
    const mb = new Batch();
    mb.add(boxGeo(V(-BEAM_HALF, PIVOT_Y - 0.25, -1.1), V(BEAM_HALF, PIVOT_Y + 0.35, 1.1), 2), M.wood);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -PLAT.x1 : PLAT.x0, x1 = s < 0 ? -PLAT.x0 : PLAT.x1, col = s < 0 ? M.blue : M.red;
      mb.add(boxGeo(V(x0, PLAT.top - 0.7, PLAT.z0), V(x1, PLAT.top, PLAT.z1)), col);
      mb.add(boxGeo(V(x0 - 0.08, PLAT.top - 0.12, PLAT.z0 - 0.08), V(x1 + 0.08, PLAT.top + 0.02, PLAT.z1 + 0.08)), M.trim);
      // back rail + side posts (the front stays open toward the cameras)
      const xb = s < 0 ? x0 : x1;
      mb.add(boxGeo(V(x0, PLAT.top + 0.95, PLAT.z1 - 0.12), V(x1, PLAT.top + 1.07, PLAT.z1)), M.trim);
      for (let i = 0; i <= 4; i++) { const x = x0 + ((x1 - x0) * i) / 4; mb.add(boxGeo(V(x - 0.06, PLAT.top, PLAT.z1 - 0.12), V(x + 0.06, PLAT.top + 1.0, PLAT.z1)), M.trim); }
      mb.add(boxGeo(V(xb - 0.06, PLAT.top + 0.95, PLAT.z0 + 0.6), V(xb + 0.06, PLAT.top + 1.07, PLAT.z1)), M.trim);
      // a little handle bar like a playground seesaw, on the inner end
      const xi = s < 0 ? x1 : x0;
      mb.add(boxGeo(V(xi - 0.09, PLAT.top, -0.09), V(xi + 0.09, PLAT.top + 1.5, 0.09)), M.iron);
    }
    mb.build(this.seesaw);
    this.seesaw.matrixAutoUpdate = false;
    R.add(this.seesaw);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private poseSeesaw(id: number, t: number) {
    const a = -THREE.MathUtils.degToRad(tiltAt(id, t));
    this.seesaw.matrix.makeTranslation(0, PIVOT_Y, 0).multiply(this.m4.makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(0, -PIVOT_Y, 0));
    this.seesaw.matrixWorldNeedsUpdate = true;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 14, 110);
    if (s.light === "golden") Rr = Math.max(Rr, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 260); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 560; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK[s.light].bounce); TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar * 1.4;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i];
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    this.poseSeesaw(id, t);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
export type { V3 };
