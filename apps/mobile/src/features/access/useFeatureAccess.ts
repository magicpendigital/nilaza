import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { resolveFeatureAccess, REFRESH_MS, type FeatureAccess, type FeatureId } from "./featureAccessConfig";
import { getFeatureAccessService, type FeatureAccessService, type FeatureAccessSnapshot } from "./featureAccessService";

/**
 * Free / Premium state of one on-device feature for the current account.
 * `isPremium` comes from usePremium().entitled; `switchedOff` from the existing release flag or AI switch for that
 * feature, which always wins (a feature turned off there is never shown again because of this switch).
 * Picks up a newly published copy within about 5 minutes: on mount, when the app comes back to the foreground,
 * and every 5 minutes while mounted. Offline it keeps the cached copy or the built-in defaults.
 */
export function useFeatureAccess(
  featureId: FeatureId,
  options: { isPremium: boolean; switchedOff?: boolean; service?: FeatureAccessService }
): FeatureAccess {
  const service = options.service ?? getFeatureAccessService();
  const [snapshot, setSnapshot] = useState<FeatureAccessSnapshot>(() => service.get());

  useEffect(() => {
    let alive = true;
    const unsubscribe = service.subscribe((next) => { if (alive) setSnapshot(next); });
    setSnapshot(service.get());
    void service.refresh();
    const timer = setInterval(() => { void service.refresh(); }, REFRESH_MS);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void service.refresh();
    });
    return () => {
      alive = false;
      unsubscribe();
      clearInterval(timer);
      appState.remove();
    };
  }, [service]);

  return useMemo(() => resolveFeatureAccess({
    featureId,
    config: snapshot.config,
    isPremium: options.isPremium,
    switchedOff: options.switchedOff,
    configVersion: snapshot.version,
    source: snapshot.source
  }), [featureId, snapshot, options.isPremium, options.switchedOff]);
}
