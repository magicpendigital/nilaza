import { deliverExport } from "../deliverExport.web";
test("web downloads JSON with filename and releases its object URL", async () => {
  jest.useFakeTimers();
  const click = jest.fn(), remove = jest.fn();
  const anchor = { click, remove, href: "", download: "" };
  const mockDocument = { createElement: jest.fn(() => anchor), body: { appendChild: jest.fn() } };
  const previous = (globalThis as any).document;
  (globalThis as any).document = mockDocument;
  const create = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:qa-export");
  const revoke = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  try {
    await expect(deliverExport("{}", "nilaza-data-2026-10-01.json", () => true)).resolves.toBe("download_requested");
    expect(anchor.download).toBe("nilaza-data-2026-10-01.json"); expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1); expect(revoke).not.toHaveBeenCalled();
    jest.runAllTimers(); expect(revoke).toHaveBeenCalledWith("blob:qa-export");
  } finally { create.mockRestore(); revoke.mockRestore(); (globalThis as any).document = previous; jest.useRealTimers(); }
});
