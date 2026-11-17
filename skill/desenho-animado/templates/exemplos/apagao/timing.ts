// Todos os tempos do vídeo saem da narração (words.json, marcado por audio/marcar_frases.py: s = linha do roteiro,
// w = palavra como está escrita). Trocou a voz (ex.: a gravação do usuário)? Gere o words.json novo e tudo se move junto:
// cenas, reações, câmera, legendas e som (o som lê out/<nome>/timing.json, gerado por scripts/timing-json.mjs).
import words from "./words.json";

export type W = { w: string; t0: number; t1: number; s: number; k: number };
export const WORDS = words as W[];
const n = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** início (ou fim) da palavra `word` na linha `line` do roteiro; `nth` = qual ocorrência dela nessa linha */
export const tw = (line: number, word: string, nth = 0, end = false): number => {
  const m = WORDS.filter((x) => x.s === line && n(x.w) === n(word));
  if (!m[nth]) throw new Error(`timing: a palavra "${word}" (#${nth}) não está na linha ${line} do roteiro`);
  return end ? m[nth].t1 : m[nth].t0;
};
export const lineStart = (line: number) => {
  const x = WORDS.find((w) => w.s === line);
  if (!x) throw new Error(`timing: linha ${line} não existe no roteiro`);
  return x.t0;
};
export const VOICE_END = WORDS[WORDS.length - 1].t1;
