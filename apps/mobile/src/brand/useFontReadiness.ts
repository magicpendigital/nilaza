import { useEffect, useState } from "react";

/** Local font failures must not trap the native splash or block authentication. */
export function useFontReadiness(loaded: boolean, error: Error | null) {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [loaded, error]);
  return loaded || Boolean(error) || timedOut;
}
