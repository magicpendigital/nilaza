import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveJson, loadJson, removeJson } from "../storage";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveJson", () => {
    it("should successfully save json data", async () => {
      const data = { foo: "bar" };
      await saveJson("test-key", data);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(data)
      );
    });

    it("should swallow errors when AsyncStorage.setItem fails", async () => {
      // Mock AsyncStorage.setItem to throw an error
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error("AsyncStorage is full")
      );

      // We expect this to resolve, not reject
      await expect(saveJson("test-key", { foo: "bar" })).resolves.toBeUndefined();
    });
  });

  describe("loadJson", () => {
    it("should successfully load and parse json data", async () => {
      const data = { foo: "bar" };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(data)
      );

      const result = await loadJson("test-key", { default: true });
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("test-key");
      expect(result).toEqual(data);
    });

    it("should repair persisted mojibake strings and save the cleaned value", async () => {
      const stored = {
        title: "Tr\u00c3\u00b2 chuy\u00e1\u00bb\u2021n",
        nested: {
          text: "Kh\u00c3\u00a1m ph\u00c3\u00a1"
        }
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await loadJson("nilaza.dailyInsight", stored);

      expect(result).toEqual({
        title: "Trò chuyện",
        nested: {
          text: "Khám phá"
        }
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("nilaza.dailyInsight", JSON.stringify(result));
    });

    it("should repair double-encoded mojibake strings", async () => {
      const stored = {
        text: "Ch\u00c3\u0192\u00c2\u00a1\u00c3\u201a\u00c2\u00bb\u00c3\u201a\u00c2\u008dn guide"
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await loadJson("nilaza.messages", stored);

      expect(result).toEqual({ text: "Chọn guide" });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("nilaza.messages", JSON.stringify(result));
    });

    it("should keep valid Vietnamese strings unchanged", async () => {
      const stored = { text: "Âm vang di sản" };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await loadJson("nilaza.journal", stored);

      expect(result).toEqual(stored);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it("should return fallback when item does not exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await loadJson("test-key", { default: true });
      expect(result).toEqual({ default: true });
    });

    it("should return fallback when AsyncStorage.getItem fails", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error("Read failed")
      );

      const result = await loadJson("test-key", { default: true });
      expect(result).toEqual({ default: true });
    });

    it("should return fallback when parsing fails", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("invalid-json");

      const result = await loadJson("test-key", { default: true });
      expect(result).toEqual({ default: true });
    });
  });

  describe("removeJson", () => {
    it("should successfully remove item", async () => {
      await removeJson("test-key");
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("test-key");
    });

    it("should swallow errors when AsyncStorage.removeItem fails", async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error("Delete failed")
      );

      // We expect this to resolve, not reject
      await expect(removeJson("test-key")).resolves.toBeUndefined();
    });
  });
});
