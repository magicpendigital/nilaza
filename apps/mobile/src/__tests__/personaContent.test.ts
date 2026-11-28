import figures from "../../../../packages/content/data/personas-figures.json";
import books from "../../../../packages/content/data/personas-books.json";
import archetypes from "../../../../packages/content/data/personas-archetypes.json";
import detail from "../../../../packages/content/data/persona-detail-content.json";
import shortNames from "../../../../packages/content/data/persona-short-names.json";

const personas = [...figures, ...books, ...archetypes] as { id: string; type: string; slug: string }[];
const names = shortNames.personas as Record<string, { opener?: { vi: string; en: string } }>;

describe("persona content (chat knowledge Lô 0)", () => {
  it("gives every persona its own opening line in both languages", () => {
    for (const persona of personas) {
      const opener = names[persona.id]?.opener;
      expect(opener?.vi?.trim().length).toBeGreaterThan(20);
      expect(opener?.en?.trim().length).toBeGreaterThan(20);
      expect((opener?.vi ?? "").length).toBeLessThanOrEqual(240);
    }
    expect(new Set(personas.map((persona) => names[persona.id]?.opener?.vi)).size).toBe(personas.length);
  });

  it("never shows a figure or book line as a verbatim quotation", () => {
    const attributed = new Set(personas.filter((persona) => persona.type !== "archetype_guide").map((persona) => persona.id));
    for (const section of detail as { ownerId: string; blocks: { kind?: string; quote?: { vi: string; en: string } }[] }[]) {
      if (!attributed.has(section.ownerId)) continue;
      for (const block of section.blocks) {
        if (block.kind !== "quote") continue;
        expect(block.quote?.vi).toMatch(/^Tinh thần:/);
        expect(block.quote?.en).toMatch(/^In spirit:/);
      }
    }
  });

  it("includes the two new book personas with detail sections", () => {
    for (const id of ["book-dhammapada", "book-i-ching"]) {
      expect(personas.some((persona) => persona.id === id)).toBe(true);
      const sections = (detail as { ownerId: string; sectionKey: string }[]).filter((section) => section.ownerId === id);
      expect(sections.map((section) => section.sectionKey).sort()).toEqual(["chronicle", "reflections"]);
    }
  });
});
