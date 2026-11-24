// The birth name is saved on this device only, under the signed-in account's storage. It is never put in a
// share card, a share link, an event, or any request. A guest has no account storage, so it stays in memory.
export const numerologyStorageKey = "nilaza.numerology.v1";
export const nameMaxLength = 80;

export type NumerologyStorage = {
  loadJson<T>(key: string, fallback: T): Promise<T>;
  saveJson<T>(key: string, value: T): Promise<void>;
};

type Saved = { schemaVersion: 1; name: string };

export const cleanName = (value: string) => value.replace(/\s+/g, " ").trimStart().slice(0, nameMaxLength);

export async function loadSavedName(storage: NumerologyStorage): Promise<string> {
  try {
    const saved = await storage.loadJson<Partial<Saved> | null>(numerologyStorageKey, null);
    return saved && saved.schemaVersion === 1 && typeof saved.name === "string" ? cleanName(saved.name) : "";
  } catch {
    return "";
  }
}

export async function saveName(storage: NumerologyStorage, name: string): Promise<void> {
  const clean = cleanName(name).trim();
  await storage.saveJson<Saved>(numerologyStorageKey, { schemaVersion: 1, name: clean });
}
