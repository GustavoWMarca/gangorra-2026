// __TITULO__ — legendas animadas (camada transparente, colada pelo produzir). Posição: embaixo (0,79); suba pro céu
// (0,12) nas cenas com rostos na parte de baixo.
import React from "react";
import { Legendas, tokenize, groupOf, Word } from "../../legendas/Legendas";
import words from "./words.json";
import { shotAt, FPS } from "./story";

/** números falados por extenso -> algarismos */
const REPLACE: [string, string][] = [["dois mil e vinte e seis", "2026"]];
const GROUPS = groupOf(tokenize(words as Word[], REPLACE));
/** altura por cena: 0,79 = embaixo (padrão); 0,12 = no céu, para as cenas com rostos na parte de baixo (ponha os ids em CEU) */
const CEU: number[] = [];
const yAt = (t: number) => (CEU.includes(shotAt(Math.round(t * FPS)).id) ? 0.12 : 0.79);
export const Legendas__Nome__: React.FC = () => <Legendas groups={GROUPS} yAt={yAt} size={92} />;