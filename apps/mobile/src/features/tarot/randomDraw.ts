export type RandomSource = () => number;

/** Uniform float in [0, 1): crypto.getRandomValues when the runtime has it, else Math.random. */
export const defaultRandom: RandomSource = () => {
  const cryptoApi = (globalThis as { crypto?: { getRandomValues?: (array: Uint32Array) => Uint32Array } }).crypto;
  if (cryptoApi?.getRandomValues) {
    const buffer = new Uint32Array(1);
    cryptoApi.getRandomValues(buffer);
    return buffer[0] / 2 ** 32;
  }
  return Math.random();
};

export type RandomDraw = { index: number; reversed: boolean };

/**
 * Picks `count` distinct card indexes out of `total` and an independent orientation for each.
 * Orientation used to follow index parity, so a one-card draw always showed a card the same way.
 */
export function drawRandomCards(count: number, total: number, options: { reversedRate?: number; random?: RandomSource } = {}): RandomDraw[] {
  const random = options.random ?? defaultRandom;
  const reversedRate = options.reversedRate ?? 0.5;
  const pool = Array.from({ length: total }, (_, index) => index);
  const picks: RandomDraw[] = [];
  for (let slot = 0; slot < Math.min(count, total); slot += 1) {
    const swap = slot + Math.floor(random() * (total - slot));
    [pool[slot], pool[swap]] = [pool[swap], pool[slot]];
    picks.push({ index: pool[slot], reversed: random() < reversedRate });
  }
  return picks;
}
