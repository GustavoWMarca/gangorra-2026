// Exporta os tempos do story.ts (FPS, TOTAL, SHOTS e toda constante T_*) para o script de som em Python.
// uso: node scripts/timing-json.mjs src/videos/<nome> out/<nome>/timing.json
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import * as esbuild from "esbuild";

const [dirArg, outArg] = process.argv.slice(2);
const dir = path.resolve(dirArg), tmp = path.resolve("out/tmp"); fs.mkdirSync(tmp, { recursive: true });
const outFile = path.join(tmp, "timing-bundle.cjs");
await esbuild.build({ entryPoints: [path.join(dir, "story.ts")], bundle: true, platform: "node", format: "cjs", outfile: outFile, logLevel: "error" });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => null }) }; // the kit makes a canvas at load
const story = createRequire(import.meta.url)(outFile);
const T = Object.fromEntries(Object.entries(story).filter(([k, v]) => /^T_/.test(k) && typeof v === "number").map(([k, v]) => [k.slice(2), v]));
const data = { FPS: story.FPS, TOTAL: story.TOTAL, SHOTS: story.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b, light: s.light, crowd: s.crowd })), T };
fs.writeFileSync(path.resolve(outArg), JSON.stringify(data, null, 1));
console.log(`timing: ${data.TOTAL} quadros, ${data.SHOTS.length} cenas, ${Object.keys(T).length} tempos -> ${outArg}`);
console.log("cenas (quadro inicial):", data.SHOTS.map((s) => s.a).join(", "));
