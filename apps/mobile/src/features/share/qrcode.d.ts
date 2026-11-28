// Types for the part of qrcode@1.5.4 the share card uses: the core encoder only (no canvas, PNG or terminal renderers).
declare module "qrcode/lib/core/qrcode" {
  export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
  export type QrModules = { size: number; data: Uint8Array | boolean[]; get(row: number, col: number): number | boolean };
  export function create(text: string, options?: { errorCorrectionLevel?: QrErrorCorrectionLevel }): { modules: QrModules; version: number };
}
