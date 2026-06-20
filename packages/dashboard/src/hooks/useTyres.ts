import { useMemo } from "react";

import type { Stint } from "@/shared/types/api";

export function useTyres(stints: Stint[], currentLap: number) {
  return useMemo(() => {
    const tyreMap = new Map<number, string>();
    const lapForTyres = currentLap || 9999;

    for (const stint of stints) {
      if (stint.lap_start <= lapForTyres && stint.lap_end >= lapForTyres) {
        tyreMap.set(stint.driver_number, stint.compound);
      }
    }

    // For drivers not on track, use their latest stint
    const stintByDriver = new Map<number, Stint>();
    for (const stint of stints) {
      const existing = stintByDriver.get(stint.driver_number);
      if (!existing || stint.stint_number > existing.stint_number) {
        stintByDriver.set(stint.driver_number, stint);
      }
    }
    for (const [dn, stint] of stintByDriver) {
      if (!tyreMap.has(dn)) {
        tyreMap.set(dn, stint.compound);
      }
    }

    return tyreMap;
  }, [stints, currentLap]);
}
