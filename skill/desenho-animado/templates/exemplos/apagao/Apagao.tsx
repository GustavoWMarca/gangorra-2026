// O apagão do dia 17 — componente Remotion montado pelo kit (src/kit/Short.tsx).
import { makeShort } from "../../kit/Short";
import { newWorld } from "./world";
import { TOTAL, FLASH_AT, SHOTS, layersAt, dofAt } from "./story";

export const APAGAO_FRAMES = TOTAL;
export const ApagaoShort = makeShort({ newWorld, TOTAL, FLASH_AT, SHOTS, layersAt, dofAt });