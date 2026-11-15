import { useCallback, useEffect, useRef, useState } from "react";
import { getBillingClient, type BillingClient, type BillingCustomer } from "./billingClient";
import { entitledPeriodEnd, isPremiumEntitled, type SubscriptionRow } from "./premiumEntitlement";

/** Webhook delivery can lag the store: re-read the account row for about 30 seconds after a purchase. */
export const ACTIVATION_POLL_DELAYS_MS = [2_000, 3_000, 5_000, 5_000, 5_000, 5_000, 5_000] as const;

export type PremiumState = {
  /** Premium for display: active store entitlement on this device or a valid account row. */
  entitled: boolean;
  /** The account row (what the server checks) grants Premium. */
  serverEntitled: boolean;
  /** Bought on this device but the account row has not caught up yet. */
  activating: boolean;
  customer: BillingCustomer | null;
  /** Renewal or end date when known (account row first, then the store). */
  periodEnd: string | undefined;
  billingAvailable: boolean;
  /** Called by the purchase screen after a successful purchase or restore. */
  onStoreUpdate: (customer: BillingCustomer) => void;
  refresh: () => void;
  client: BillingClient;
};

export function usePremium(input: {
  userId: string | undefined;
  /** Reads the signed-in user's own subscriptions rows; rejects when offline or signed out. */
  readSubscriptions: () => Promise<SubscriptionRow[]>;
  /** Only talk to the store SDK while the purchase screen may be shown. */
  billingEnabled: boolean;
  client?: BillingClient;
  now?: () => Date;
}): PremiumState {
  const client = input.client ?? getBillingClient();
  const { userId, billingEnabled } = input;
  const useStore = billingEnabled && client.available;
  // null = never read for this account: fail closed. A failed re-read keeps the last known rows.
  const [rows, setRows] = useState<SubscriptionRow[] | null>(null);
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [activating, setActivating] = useState(false);
  const readRef = useRef(input.readSubscriptions);
  readRef.current = input.readSubscriptions;
  const generation = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const now = input.now ?? (() => new Date());

  const stopPolling = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = undefined;
  };

  const readRows = useCallback(async (owner: number): Promise<SubscriptionRow[] | null> => {
    try {
      const next = await readRef.current();
      if (owner !== generation.current) return null;
      setRows(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  // New account (or sign-out): forget everything from the previous one, then load.
  useEffect(() => {
    const owner = ++generation.current;
    stopPolling();
    setRows(null);
    setCustomer(null);
    setActivating(false);
    if (userId) void readRows(owner);
    let unsubscribe: () => void = () => undefined;
    if (useStore) {
      void client.identify(userId).then((info) => {
        if (owner !== generation.current || !userId) return;
        if (info) setCustomer(info);
        unsubscribe = client.subscribe((next) => {
          if (owner === generation.current) setCustomer(next);
        });
      }).catch(() => undefined);
    }
    return () => {
      generation.current++;
      stopPolling();
      unsubscribe();
    };
  }, [client, readRows, useStore, userId]);

  const poll = useCallback((owner: number, step: number) => {
    if (step >= ACTIVATION_POLL_DELAYS_MS.length) {
      if (owner === generation.current) setActivating(false);
      return;
    }
    pollTimer.current = setTimeout(() => {
      void readRows(owner).then((next) => {
        if (owner !== generation.current) return;
        if (next && isPremiumEntitled(next, now())) {
          setActivating(false);
          return;
        }
        poll(owner, step + 1);
      });
    }, ACTIVATION_POLL_DELAYS_MS[step]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readRows]);

  const onStoreUpdate = useCallback((next: BillingCustomer) => {
    const owner = generation.current;
    setCustomer(next);
    stopPolling();
    if (!next.premiumActive || !userId) return;
    if (rows && isPremiumEntitled(rows, now())) return;
    setActivating(true);
    poll(owner, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll, rows, userId]);

  const refresh = useCallback(() => {
    if (userId) void readRows(generation.current);
  }, [readRows, userId]);

  const current = now();
  const serverEntitled = Boolean(userId) && isPremiumEntitled(rows, current);
  const storeEntitled = Boolean(userId) && Boolean(customer?.premiumActive);
  return {
    entitled: serverEntitled || storeEntitled,
    serverEntitled,
    activating: activating && !serverEntitled,
    customer,
    periodEnd: entitledPeriodEnd(rows, current) ?? customer?.expirationDate ?? undefined,
    billingAvailable: useStore,
    onStoreUpdate,
    refresh,
    client,
  };
}
