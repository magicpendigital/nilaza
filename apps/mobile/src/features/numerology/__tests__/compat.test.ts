import { buildNumerologyMap, numberFrom } from "../calc";
import { compareNumerology, relationOf } from "../compat";

test("relations use the root: same, same parity, different parity", () => {
  expect(relationOf(numberFrom(11), numberFrom(2))).toBe("same");
  expect(relationOf(numberFrom(22), numberFrom(4))).toBe("same");
  expect(relationOf(numberFrom(3), numberFrom(7))).toBe("sameParity");
  expect(relationOf(numberFrom(2), numberFrom(8))).toBe("sameParity");
  expect(relationOf(numberFrom(11), numberFrom(5))).toBe("differentParity");
});

test("only the life path is compared when one person has no name", () => {
  const a = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!;
  const b = buildNumerologyMap("1992-09-15")!;
  const rows = compareNumerology(a, b);
  expect(rows.map((row) => row.kind)).toEqual(["lifePath"]);
  expect(rows[0]).toMatchObject({ relation: "differentParity" });
  expect(rows[0].a.label).toBe("11/2");
  expect(rows[0].b.label).toBe("9");
  expect(compareNumerology(b, a).map((row) => row.kind)).toEqual(["lifePath"]);
});

test("soul urge and expression are added when both have a name", () => {
  const a = buildNumerologyMap("2000-03-15", "Phạm Gia Linh")!; // expression 8, soul urge 2
  const b = buildNumerologyMap("2000-02-29", "Phạm Thị Thúy")!; // life path 6, expression 5, soul urge 4
  const rows = compareNumerology(a, b);
  expect(rows.map((row) => [row.kind, row.a.label, row.b.label, row.relation])).toEqual([
    ["lifePath", "11/2", "6", "sameParity"],
    ["soulUrge", "2", "4", "sameParity"],
    ["expression", "8", "5", "differentParity"]
  ]);
});

test("the result carries no score or percentage", () => {
  const rows = compareNumerology(buildNumerologyMap("2000-03-15", "An")!, buildNumerologyMap("2000-03-15", "An")!);
  expect(rows.every((row) => row.relation === "same")).toBe(true);
  const text = JSON.stringify(rows);
  expect(text).not.toMatch(/%|score|percent|rank/i);
  for (const row of rows) expect(Object.keys(row).sort()).toEqual(["a", "b", "kind", "relation"]);
});
