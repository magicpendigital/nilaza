import { UsageError, validateUsageSpec, type UsageSpec, type UsageStore } from "./ai-usage-store.ts";

export interface MeteredDependencies<T> {
  store: UsageStore;
  // One provider attempt only. No hidden retries, tools or nested agent calls.
  generate(attempt: number): Promise<{ value: T; costMicro: number | null }>;
  // Must persist for the verified account and return its durable receipt UUID.
  persist(value: T, operationId: string): Promise<string>;
  // Authoritative operation-keyed recovery after an ambiguous save ACK. If lookup fails, retain all holds.
  findSavedResult(operationId: string): Promise<{ resultId: string; value: T } | null>;
  // Integration must authorize ownership again, and preserve the original result unchanged.
  loadOwnedResult(resultId: string): Promise<T>;
}
export type MeteredResult<T> = { value: T; resultId: string; replay: boolean; settlement: string };

export async function runMeteredOperation<T>(spec: UsageSpec, deps: MeteredDependencies<T>): Promise<MeteredResult<T>> {
  validateUsageSpec(spec);
  // Snapshot the trusted spec before any asynchronous callback can mutate it.
  const s = { ...spec, attemptBounds: [...spec.attemptBounds] };
  const lease = crypto.randomUUID();
  const r = await deps.store.reserve(s, lease);
  if (r.status === "replay") return { value: await deps.loadOwnedResult(r.resultId), resultId: r.resultId, replay: true, settlement: "replay" };
  if (r.status !== "created") throw new UsageError(r.status === "blocked" ? r.code : "request_" + r.status);
  for (let attempt = 1; attempt <= s.attemptBounds.length; attempt++) {
    // A failed/ambiguous claim cannot trigger generation or automatic takeover.
    await deps.store.claim(s.id, lease, attempt);
    let generated: { value: T; costMicro: number | null };
    try { generated = await deps.generate(attempt); }
    catch {
      // An arbitrary exception is not evidence that the provider billed zero.
      await deps.store.receipt(s.id, lease, attempt, null, false);
      if (attempt < s.attemptBounds.length) continue;
      await deps.store.finish(s.id, lease, false);
      throw new UsageError("provider_unavailable");
    }
    // Invalid/missing usage retains the full reservation; no result is claimed complete.
    if (generated.costMicro !== null && (!Number.isSafeInteger(generated.costMicro) || generated.costMicro < 0)) {
      await deps.store.receipt(s.id, lease, attempt, null, false);
      await deps.store.finish(s.id, lease, false);
      throw new UsageError("invalid_receipt");
    }
    await deps.store.receipt(s.id, lease, attempt, generated.costMicro, true);
    if (generated.costMicro !== null && generated.costMicro > s.attemptBounds[attempt - 1]) {
      await deps.store.finish(s.id, lease, false);
      throw new UsageError("cost_bound_exceeded");
    }
    let resultId: string;
    try { resultId = await deps.persist(generated.value, s.id); }
    catch {
      const recovered = await deps.findSavedResult(s.id);
      if (recovered) {
        const settlement = await deps.store.finish(s.id, lease, true, recovered.resultId);
        return { ...recovered, replay: false, settlement };
      }
      await deps.store.finish(s.id, lease, false);
      throw new UsageError("result_not_saved");
    }
    const settlement = await deps.store.finish(s.id, lease, true, resultId);
    return { value: generated.value, resultId, replay: false, settlement };
  }
  throw new UsageError("usage_unavailable");
}
