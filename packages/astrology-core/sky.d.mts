export type MoonQuarterKind = "new" | "first_quarter" | "full" | "last_quarter";
export type MoonState = { longitude: number; sign: string; degree: number; illumination: number; elongation: number; waxing: boolean };
export type SignChange = { at: Date; from: string; to: string };
export const moonQuarterKinds: MoonQuarterKind[];
export function moonStateAt(date: Date): MoonState;
export function signChangesBetween(body: string, start: Date, end: Date, stepMs?: number): SignChange[];
export function moonQuartersBetween(start: Date, end: Date): { kind: MoonQuarterKind; at: Date }[];
export function nextNewOrFullMoon(start: Date): { kind: "new" | "full"; at: Date };
