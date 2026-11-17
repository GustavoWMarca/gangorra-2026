import React from "react";
import { Composition } from "remotion";
import { EleicoesShort, ELEICOES_FRAMES } from "./videos/eleicoes/Eleicoes";
import { ApagaoShort, APAGAO_FRAMES } from "./videos/apagao/Apagao";
import { LegendasApagao } from "./videos/apagao/LegendasApagao";
export const Root: React.FC = () => (
  <>
    <Composition id="EleicoesShort" component={EleicoesShort} durationInFrames={ELEICOES_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LegendasApagao" component={LegendasApagao} durationInFrames={APAGAO_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="ApagaoShort" component={ApagaoShort} durationInFrames={APAGAO_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
