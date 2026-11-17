// Legendas animadas estilo Shorts: blocos de 2-3 palavras, letra grossa branca com contorno preto, a palavra falada
// em amarelo com um "pop". Renderizadas sozinhas sobre fundo transparente e coladas no vídeo pronto pelo ffmpeg
// (não refaz o 3D). Tudo sincronizado no words.json da narração.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { w: string; t0: number; t1: number };
type Tok = { text: string; t0: number; t1: number };
type Group = { toks: Tok[]; a: number; b: number };

/** junta sequências faladas por extenso numa forma curta ("dois mil e vinte e seis" -> "2026") */
export const tokenize = (words: Word[], replace: [string, string][]): Tok[] => {
  const low = words.map((x) => x.w.toLowerCase());
  const out: Tok[] = [];
  for (let i = 0; i < words.length; ) {
    let hit: [number, string] | null = null;
    for (const [from, to] of replace) {
      const seq = from.split(" ");
      if (seq.every((s, k) => low[i + k] === s) && (!hit || seq.length > hit[0])) hit = [seq.length, to];
    }
    const n = hit ? hit[0] : 1;
    out.push({ text: hit ? hit[1] : words[i].w, t0: words[i].t0, t1: words[i + n - 1].t1 });
    i += n;
  }
  return out;
};

/** blocos: até 3 palavras e ~16 letras; pausa > 0,3 s sempre quebra */
export const groupOf = (toks: Tok[], maxWords = 3, maxChars = 16): Group[] => {
  const gs: Group[] = [];
  let cur: Tok[] = [];
  const flush = () => { if (cur.length) gs.push({ toks: cur, a: cur[0].t0, b: cur[cur.length - 1].t1 }); cur = []; };
  for (const t of toks) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((s, x) => s + x.text.length + 1, 0) + t.text.length;
    if (prev && (t.t0 - prev.t1 > 0.3 || cur.length >= maxWords || chars > maxChars)) flush();
    cur.push(t);
  }
  flush();
  return gs;
};

const YELLOW = "#ffd84a";
const pop = (u: number) => (u < 0 ? 0 : u < 1 ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, u)) : 1.0);

export const Legendas: React.FC<{ groups: Group[]; yAt: (t: number) => number; size?: number }> = ({ groups, yAt, size = 104 }) => {
  const f = useCurrentFrame(), { fps, height } = useVideoConfig(), t = f / fps;
  const gi = groups.findIndex((g, i) => {
    const next = groups[i + 1];
    const end = next ? Math.min(next.a - 0.02, g.b + 0.6) : g.b + 0.6;
    return t >= g.a - 0.05 && t < end;
  });
  if (gi < 0) return null;
  const g = groups[gi], ent = Math.min(1, (t - (g.a - 0.05)) / 0.12);
  const scale = 0.82 + 0.18 * (1 - (1 - ent) ** 3);
  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <div style={{
        position: "absolute", left: 40, right: 40, top: yAt(t) * height, transform: `translateY(-50%) scale(${scale})`,
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 40px", textAlign: "center",
        fontFamily: "'Arial Black', 'Arial', sans-serif", fontWeight: 900, fontSize: size, lineHeight: 1.08, letterSpacing: 1,
        textTransform: "uppercase", opacity: ent,
      }}>
        {g.toks.map((k, i) => {
          const on = t >= k.t0 - 0.03 && (i + 1 < g.toks.length ? t < g.toks[i + 1].t0 - 0.03 : true);
          const s = on ? pop((t - k.t0 + 0.03) / 0.16) : 1;
          return (
            <span key={i} style={{
              display: "inline-block", transform: `scale(${s})`, color: on ? YELLOW : "#ffffff",
              WebkitTextStroke: "14px #120e14", paintOrder: "stroke fill",
              textShadow: "0 8px 0 rgba(0,0,0,0.55), 0 0 18px rgba(0,0,0,0.35)",
            }}>{k.text}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
