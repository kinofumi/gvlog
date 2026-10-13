/** 描画先。画面の <canvas> でも、書き出しや Worker の OffscreenCanvas でも同じ関数で描く */
export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
