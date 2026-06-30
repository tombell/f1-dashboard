import { useCallback, useRef, useState } from "react";

import type { PitStop } from "@/shared/types/api";

const PIT_CLEAR_MS = 20_000;

export function usePitDetection() {
  const prevPitCounts = useRef<Map<number, number> | null>(null);
  const [recentPits, setRecentPits] = useState<Set<number>>(new Set());

  const detectPits = useCallback((pits: PitStop[]) => {
    const previousCounts = prevPitCounts.current ?? new Map<number, number>();
    const pitCounts = new Map<number, number>();
    for (const pit of pits) {
      pitCounts.set(pit.driver_number, (pitCounts.get(pit.driver_number) ?? 0) + 1);
    }

    const newPits = new Set<number>();
    const isFirstRun = previousCounts.size === 0;
    for (const [dn, count] of pitCounts) {
      const prev = previousCounts.get(dn) ?? 0;
      if (count > prev) {
        newPits.add(dn);
      }
    }

    if (!isFirstRun && newPits.size > 0) {
      setRecentPits(newPits);
      setTimeout(() => setRecentPits(new Set()), PIT_CLEAR_MS);
    }
    prevPitCounts.current = pitCounts;
  }, []);

  return { recentPits, detectPits };
}
