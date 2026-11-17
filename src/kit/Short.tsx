// KIT: o componente Remotion de todo desenho. Um mundo three.js (o World do vídeo) posado a cada quadro pela linha do
// tempo do story.ts. Acabamento: contorno (passada própria) -> desfoque de lente pré + principal -> [bloom (só
// emissivos) + tone map NEUTRAL + cor] numa passada, MSAA 4. Parâmetros em pixel valem a 1080x1920 e escalam com a
// saída. Troca de lugar faz fusão empilhando um segundo canvas; FLASH_AT dá 4 quadros de flash branco.
// uso no vídeo:  export const MeuShort = makeShort({ newWorld: () => new MeuWorld(), TOTAL, FLASH_AT, SHOTS, layersAt, dofAt });
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";

export type V3 = [number, number, number];
export type ShortCfg = {
  newWorld: () => { root: THREE.Object3D; update: (id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) => THREE.Vector3 };
  TOTAL: number; FLASH_AT: number;
  SHOTS: { id: number; light: "day" | "golden" }[];
  layersAt: (f: number) => { id: number; alpha: number }[];
  dofAt: (f: number) => { cInf: number; focus?: (f: number) => V3 };
};

/** A/B switches (Remotion inputProps `{ post: { ink: false, lens: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** bloom for emissive sources only; the MIP chain always starts at 540x960 so the glow keeps its size at any output size */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;

export const makeShort = (S: ShortCfg): React.FC => {
  const Inner: React.FC<{ id: number }> = ({ id }) => {
    const f = useCurrentFrame();
    const { camera, scene } = useThree();
    const world = useMemo(() => S.newWorld(), []);
    const target = useMemo(() => new THREE.Vector3(), []);
    const on = useMemo(toggles, []);
    const fx = useMemo(() => ({
      ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
      lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
      bloom: makeBloom(),
      tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
      grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }),
    }), [camera, scene]);
    useEffect(() => () => fx.ink.dispose(), [fx]);
    // composer built by hand (the @react-three/postprocessing wrapper renders nothing with r3f 9 / postprocessing 6.39)
    const gl = useThree((st) => st.gl);
    const size = useThree((st) => st.size);
    const nopost = (getInputProps() as { nopost?: boolean }).nopost;
    const composer = useMemo(() => {
      const c = new EffectComposer(gl, { multisampling: 4, frameBufferType: THREE.HalfFloatType });
      c.addPass(new RenderPass(scene, camera));
      if (on.ink) c.addPass(fx.ink);
      if (on.lens && on.pre) c.addPass(new EffectPass(camera, fx.lens.pre));
      if (on.lens) c.addPass(new EffectPass(camera, fx.lens.main));
      c.addPass(new EffectPass(camera, ...[...(on.bloom ? [fx.bloom] : []), fx.tone, ...(on.grade ? [fx.grade] : []), ...(on.grain ? [fx.grain] : [])]));
      return c;
    }, [gl, scene, camera, fx, on]);
    useEffect(() => { composer.setSize(size.width, size.height); }, [composer, size]);
    useEffect(() => () => { composer.removeAllPasses(); }, [composer]);
    useFrame((_, dt) => { if (nopost) gl.render(scene, camera); else composer.render(dt); }, 1);
    const cam = camera as THREE.PerspectiveCamera;
    target.copy(world.update(id, f, cam, scene));
    noInkFallback(world.root);
    const d = S.dofAt(f);
    cam.getWorldDirection(fwd);
    if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
    fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
    fx.lens.cInf = d.cInf;
    gradeFor(fx.grade, S.SHOTS[id - 1].light);
    fx.grain.seed = f;
    return <primitive object={world.root} dispose={null} />;
  };
  const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={1080} height={1920} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ alpha: false, antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.2, far: 1500 }}>
        <Inner id={id} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
  return () => {
    const f = useCurrentFrame();
    const flash = f >= S.FLASH_AT && f < S.FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - S.FLASH_AT] : 0;
    return (
      <AbsoluteFill style={{ background: "#cfe3f2" }}>
        {S.layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
        {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      </AbsoluteFill>
    );
  };
};
