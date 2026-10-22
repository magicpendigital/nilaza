const mockFiles: any[] = [];
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock("expo-file-system", () => {
  class File {
    name: string; uri: string; exists = false;
    create = jest.fn(() => { this.exists = true; }); write = jest.fn();
    delete = jest.fn(() => { this.exists = false; });
    constructor(parent: any, name: string) { this.name = name; this.uri = `${parent.uri}/${name}`; mockFiles.push(this); }
  }
  class Directory {
    uri: string; exists = true; create = jest.fn(); list = jest.fn(() => mockFiles.filter(file => file.exists));
    constructor(parent: any, name: string) { this.uri = `${parent}/${name}`; }
  }
  return { File, Directory, Paths: { cache: "private-cache" } };
});
import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { cleanupExportFiles, deliverExport } from "../deliverExport";
beforeEach(() => { mockFiles.length = 0; jest.clearAllMocks(); jest.useFakeTimers(); (Platform as any).OS = "ios";
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true); (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("iOS sheet completion removes the private temp without claiming a saved copy", async () => {
  await expect(deliverExport('{"fixture":true}', "nilaza-data-2026-10-01.json", () => true)).resolves.toBe("dialog_closed");
  expect(mockFiles[0].write).toHaveBeenCalledWith('{"fixture":true}');
  expect(mockFiles[0].delete).toHaveBeenCalledTimes(1);
});
test("Android retains a readable file after chooser then expires it", async () => {
  (Platform as any).OS = "android";
  await deliverExport("{}", "nilaza-data-2026-10-01.json", () => true);
  expect(mockFiles[0].exists).toBe(true);
  jest.advanceTimersByTime(10 * 60 * 1000);
  expect(mockFiles[0].exists).toBe(false);
});
test("failed sharing immediately removes temp; unavailable/account switch creates no file", async () => {
  (Sharing.shareAsync as jest.Mock).mockRejectedValueOnce(new Error("failed sheet"));
  await expect(deliverExport("{}", "nilaza-data-2026-10-01.json", () => true)).rejects.toThrow("failed sheet");
  expect(mockFiles[0].exists).toBe(false);
  mockFiles.length = 0;
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
  await expect(deliverExport("{}", "nilaza-data-2026-10-01.json", () => true)).rejects.toThrow("unavailable");
  expect(mockFiles).toHaveLength(0);
});
test("startup cleanup touches only expired generated exports in its private folder", async () => {
  const stale = new File({ uri: "private-cache/nilaza-private-exports-v1" } as any, `nilaza-data-${Date.now() - 600001}.json`);
  stale.create();
  const other = new File({ uri: "private-cache/nilaza-private-exports-v1" } as any, "unrelated.json"); other.create();
  await cleanupExportFiles();
  expect(stale.exists).toBe(false); expect(other.exists).toBe(true);
});
test("cleanup failure preserves the original sheet outcome and startup can retry", async () => {
  (Sharing.shareAsync as jest.Mock).mockImplementationOnce(async () => {
    mockFiles[0].delete.mockImplementationOnce(() => { throw new Error("busy file"); });
  });
  await expect(deliverExport("{}", "nilaza-data-2026-10-01.json", () => true)).resolves.toBe("dialog_closed");
  expect(mockFiles[0].exists).toBe(true);
  jest.advanceTimersByTime(600001);
  await cleanupExportFiles();
  expect(mockFiles[0].exists).toBe(false);
  (Sharing.shareAsync as jest.Mock).mockImplementationOnce(async () => {
    mockFiles[1].delete.mockImplementationOnce(() => { throw new Error("busy file"); });
    throw new Error("original sheet error");
  });
  await expect(deliverExport("{}", "nilaza-data-2026-10-01.json", () => true)).rejects.toThrow("original sheet error");
});
