import React from "react";
import { Legendas, tokenize, groupOf, Word } from "../../legendas/Legendas";
import words from "./words.json";
import { shotAt, FPS, T_BOATO } from "./story";

const REPLACE: [string, string][] = [
  ["dois mil e vinte e seis", "2026"], ["dois mil e vinte e três", "2023"], ["dois mil e vinte e cinco", "2025"],
  ["dezessete", "17"], ["setenta e duas", "72"], ["cinco", "5"],
];
const GROUPS = groupOf(tokenize(words as Word[], REPLACE));

/** altura da legenda (fração da tela) por cena: embaixo, no chão (acima do título/botões do Shorts, ~12 % de baixo);
 *  nas cenas da TV os rostos ocupam a parte de baixo, então a legenda vai pro céu, acima da TV */
const yAt = (t: number) => {
  const id = shotAt(Math.round(t * FPS)).id;
  if (id === 3 || (id === 6 && t < T_BOATO - 0.12)) return 0.12;
  return 0.79;
};

export const LegendasApagao: React.FC = () => <Legendas groups={GROUPS} yAt={yAt} size={92} />;
export const LEGENDAS_GROUPS = GROUPS;
