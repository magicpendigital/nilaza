// Lô 5, lớp 4 "Hợp số" (proposal section 3 rule 10). Pure: no React, no storage, no network.
// Compares two maps number by number and names the relation only: no score, no percentage, no ranking.
// The second person's map is built from data that lives in component state only; nothing here stores it.
import type { NumerologyMap, NumerologyNumber } from "./calc";

export type CompatKind = "lifePath" | "soulUrge" | "expression";
/** "same": the same root; "sameParity": both roots odd or both even; "differentParity": one odd, one even. */
export type CompatRelation = "same" | "sameParity" | "differentParity";

export type CompatRow = { kind: CompatKind; a: NumerologyNumber; b: NumerologyNumber; relation: CompatRelation };

export function relationOf(a: NumerologyNumber, b: NumerologyNumber): CompatRelation {
  if (a.root === b.root) return "same";
  return a.root % 2 === b.root % 2 ? "sameParity" : "differentParity";
}

/** Life path always; soul urge and expression only when both people gave a name. */
export function compareNumerology(a: NumerologyMap, b: NumerologyMap): CompatRow[] {
  const rows: CompatRow[] = [{ kind: "lifePath", a: a.lifePath, b: b.lifePath, relation: relationOf(a.lifePath, b.lifePath) }];
  if (a.name && b.name) {
    rows.push({ kind: "soulUrge", a: a.name.soulUrge, b: b.name.soulUrge, relation: relationOf(a.name.soulUrge, b.name.soulUrge) });
    rows.push({ kind: "expression", a: a.name.expression, b: b.name.expression, relation: relationOf(a.name.expression, b.name.expression) });
  }
  return rows;
}
