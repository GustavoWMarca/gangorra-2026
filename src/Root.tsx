import React from "react";
import { Composition } from "remotion";
import { EleicoesShort, ELEICOES_FRAMES } from "./videos/eleicoes/Eleicoes";
export const Root: React.FC = () => (
  <>
    <Composition id="EleicoesShort" component={EleicoesShort} durationInFrames={ELEICOES_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
