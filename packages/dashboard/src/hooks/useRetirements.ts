import { useCallback, useRef, useState } from "react";

import { STALE_RETIRE, STALE_ACTIVE } from "@/shared/constants/f1";
import type { Driver, Interval, Position, RaceControlMessage, Stint } from "@/shared/types/api";

export function useRetirements() {
  const lastUpdateTimes = useRef<Map<number, number>>(new Map());
  const [retiredDrivers, setRetiredDrivers] = useState<Set<number>>(new Set());

  const detectRetirements = useCallback(
    (
      drivers: Driver[],
      positions: Position[],
      intervals: Interval[],
      rc: RaceControlMessage[],
      stints: Stint[],
    ) => {
      // Track last timing update per driver. Position updates only arrive when a car's
      // race position changes; intervals update continuously while the car is running.
      for (const item of [...positions, ...intervals]) {
        const dateMs = new Date(item.date).getTime();
        const prev = lastUpdateTimes.current.get(item.driver_number) ?? 0;
        if (dateMs > prev) {
          lastUpdateTimes.current.set(item.driver_number, dateMs);
        }
      }

      if (drivers.length === 0) return;

      const now = Date.now();
      const stale = new Set<number>();
      for (const drv of drivers) {
        const lastUpd = lastUpdateTimes.current.get(drv.driver_number);
        if (lastUpd && now - lastUpd > STALE_RETIRE) {
          stale.add(drv.driver_number);
        }
      }

      let sessionActive = false;
      for (const drv of drivers) {
        const lastUpd = lastUpdateTimes.current.get(drv.driver_number);
        if (lastUpd && now - lastUpd <= STALE_ACTIVE) {
          sessionActive = true;
          break;
        }
      }

      // Don't flag retirements during red flag (data stops for everyone)
      const isRedFlag = Array.isArray(rc) && rc.some((r) => (r.message || "").includes("RED FLAG"));

      if (isRedFlag) {
        // During red flag: compare lap counts to find genuine retirees
        const maxLap = Math.max(...stints.map((stint) => stint.lap_end ?? 0), 0);
        const redFlagStale = new Set<number>();
        for (const drv of drivers) {
          const driverStints = stints.filter((stint) => stint.driver_number === drv.driver_number);
          if (driverStints.length === 0) continue;
          const lastLap = Math.max(...driverStints.map((stint) => stint.lap_end ?? 0), 0);
          if (lastLap > 0 && maxLap - lastLap >= 3) {
            redFlagStale.add(drv.driver_number);
          }
        }
        setRetiredDrivers(new Set(redFlagStale));
      } else if (sessionActive) {
        setRetiredDrivers(new Set(stale));
      }
    },
    [],
  );

  return { retiredDrivers, detectRetirements };
}
