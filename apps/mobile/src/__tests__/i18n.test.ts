import {
  normalizeLanguage,
  localizedText,
  localizedList,
  defaultLanguage,
  fallbackLanguage
} from "../i18n";
import { Language } from "../types";

describe("i18n", () => {
  describe("normalizeLanguage", () => {
    it("returns the input language if it is valid", () => {
      expect(normalizeLanguage("en")).toBe("en");
      expect(normalizeLanguage("vi")).toBe("vi");
    });

    it("returns defaultLanguage for invalid languages", () => {
      expect(normalizeLanguage("fr")).toBe(defaultLanguage);
      expect(normalizeLanguage(undefined)).toBe(defaultLanguage);
    });
  });

  describe("localizedText", () => {
    const textData = {
      en: "English Text",
      vi: "Vietnamese Text",
      "zh-Hans": "", // empty string
    };

    it("returns the text for the requested language", () => {
      expect(localizedText(textData, "vi")).toBe("Vietnamese Text");
      expect(localizedText(textData, "en")).toBe("English Text");
    });

    it("returns the fallback language text if requested language is missing or empty", () => {
      expect(localizedText(textData, "zh-Hans")).toBe("English Text"); // Assuming en is fallback
      expect(localizedText(textData, "ko")).toBe("English Text");
    });

    it("returns the default fallback string if value is undefined", () => {
      expect(localizedText(undefined, "en")).toBe("");
      expect(localizedText(undefined, "en", "default")).toBe("default");
    });

    it("returns the default fallback string if fallback language is also empty", () => {
        expect(localizedText({ ko: "test" }, "ja", "default")).toBe("default");
    });
  });

  describe("localizedList", () => {
    const listData = {
      en: ["item 1", "item 2"],
      vi: ["mục 1"],
      "zh-Hans": [] // empty array
    };

    it("returns the list for the requested language", () => {
      expect(localizedList(listData, "vi")).toEqual(["mục 1"]);
      expect(localizedList(listData, "en")).toEqual(["item 1", "item 2"]);
    });

    it("returns the fallback language list if requested language is missing or empty", () => {
      expect(localizedList(listData, "zh-Hans")).toEqual(["item 1", "item 2"]);
      expect(localizedList(listData, "ko")).toEqual(["item 1", "item 2"]);
    });

    it("returns an empty array if value is undefined", () => {
      expect(localizedList(undefined, "en")).toEqual([]);
    });

    it("returns an empty array if neither requested nor fallback language list is valid", () => {
       expect(localizedList({ko: ["item"]}, "ja")).toEqual([]);
    });
  });
});
