import {
  formatLocalDate,
  formatLocalDateTime,
  normalizeLanguage,
  relativeDayLabel,
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

  describe("date formatting", () => {
    const lateNight = new Date(2026, 9, 28, 0, 49, 37);

    it("uses the app language instead of the device default", () => {
      expect(formatLocalDate(lateNight, "vi")).toBe("28/10/2026");
      expect(formatLocalDateTime(lateNight, "vi")).toBe("28/10/2026 00:49");
      expect(formatLocalDateTime(lateNight.toISOString(), "en")).toBe("10/28/2026 12:49 AM");
    });

    it("names recent days by calendar day, not by 24-hour blocks", () => {
      const now = new Date(2026, 9, 30, 8, 0);
      expect(relativeDayLabel(new Date(2026, 9, 30, 0, 5), now, "vi")).toBe("Hôm nay");
      expect(relativeDayLabel(new Date(2026, 9, 29, 23, 50), now, "vi")).toBe("Hôm qua");
      expect(relativeDayLabel(new Date(2026, 9, 27, 12, 0), now, "en")).toBe("3 days ago");
      expect(relativeDayLabel(new Date(2026, 9, 20, 12, 0), now, "vi")).toBe("20/10/2026");
    });
  });
});
