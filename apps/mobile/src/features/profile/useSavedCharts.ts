import { useEffect, useState } from "react";
import { astrologyStorageKey, freshAstrologyData, validAstrologyData, type AstrologyPersistence, type SavedChart } from "../astrology/persistence";

export type SavedChartsState = { status: "loading" | "ready" | "invalid" | "error"; charts: SavedChart[] };

/**
 * Saved charts for "Tôi là ai", read from the Chiêm tinh store on this device. The newest chart (index 0)
 * stands for the user's own sky, as on the Chiêm tinh hub. Bump `revision` to read again after a change.
 */
export function useSavedCharts(storage: Pick<AstrologyPersistence, "loadJson">, enabled: boolean, revision = 0): SavedChartsState {
  const [state, setState] = useState<SavedChartsState>({ status: "loading", charts: [] });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    storage.loadJson<unknown>(astrologyStorageKey, freshAstrologyData())
      .then((value) => {
        if (!live) return;
        setState(validAstrologyData(value) ? { status: "ready", charts: value.reports } : { status: "invalid", charts: [] });
      })
      .catch(() => { if (live) setState({ status: "error", charts: [] }); });
    return () => { live = false; };
  }, [enabled, revision, storage]);
  return state;
}
