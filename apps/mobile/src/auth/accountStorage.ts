import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AccountScope } from "./accountScope";
import { accountStoragePrefix } from "./sessionStorage";

// All queued operations keep their original key. A→B cannot retarget A's writes.
let pending: Promise<unknown> = Promise.resolve();
function ordered<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation);
  pending = next.catch(() => undefined);
  return next;
}

export function createAccountStorage(scope: AccountScope, onError: () => void = () => undefined) {
  const prefix = scope.userId ? accountStoragePrefix(scope.userId) : null;
  let writable = false;
  const failedWrites = new Map<string, string>();
  const keyFor = (key: string) => prefix ? prefix + key.replace(/^nilaza\./, "") : null;
  return {
    keyFor,
    markHydrated() { writable = true; },
    async loadJson<T>(key: string, fallback: T): Promise<T> {
      const scopedKey = keyFor(key);
      if (!scopedKey || !scope.active) return fallback;
      return ordered(async () => {
        const value = await AsyncStorage.getItem(scopedKey);
        return value === null ? fallback : JSON.parse(value) as T;
      });
    },
    async saveJson<T>(key: string, value: T): Promise<void> {
      const scopedKey = keyFor(key);
      if (!scopedKey || !scope.active || !writable) return;
      // Capture now, not when the queue runs.
      const serialized = JSON.stringify(value);
      try {
        await ordered(() => AsyncStorage.setItem(scopedKey, serialized));
        failedWrites.delete(scopedKey);
      } catch {
        failedWrites.set(scopedKey, serialized);
        if (scope.active) onError();
      }
    },
    // Completion gates need an acknowledged write; background drafts retain the
    // existing retry queue. A failed completion must not be replayed as success.
    async saveJsonOrThrow<T>(key: string, value: T): Promise<void> {
      const scopedKey = keyFor(key);
      if (!scopedKey || !scope.active || !writable) throw new Error("Account storage is not ready");
      const serialized = JSON.stringify(value);
      await ordered(async () => {
        if (!scope.active || !writable) throw new Error("Account storage is no longer active");
        await AsyncStorage.setItem(scopedKey, serialized);
        failedWrites.delete(scopedKey);
      });
    },
    async retryFailed(): Promise<boolean> {
      if (!scope.active || !writable) return false;
      // A bounded transaction stays before a queued clear/new edit. Do not
      // enqueue stale snapshots one by one across awaits.
      return ordered(async () => {
        for (const [key, serialized] of [...failedWrites]) {
          if (!scope.active || !writable) return false;
          if (failedWrites.get(key) !== serialized) continue;
          try {
            await AsyncStorage.setItem(key, serialized);
            if (failedWrites.get(key) === serialized) failedWrites.delete(key);
          } catch { if (scope.active) onError(); }
        }
        return scope.active && writable && failedWrites.size === 0;
      });
    },
    async clear(): Promise<void> {
      writable = false;
      failedWrites.clear();
      if (!prefix) return;
      // Exact encoded account prefix, including the separator, never all storage.
      await ordered(async () => {
        const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
        if (keys.length) await AsyncStorage.multiRemove(keys);
      });
    }
  };
}

export type AccountStorage = ReturnType<typeof createAccountStorage>;
