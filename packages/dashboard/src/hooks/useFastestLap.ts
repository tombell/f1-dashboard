import { useCallback, useRef, useState } from "react";

import type { Lap } from "@/shared/types/api";

interface UseFastestLapResult {
  fastestLapDriver: number | null;
  currentLap: number;
}

interface FastestLapState {
  time: number;
  driver: number;
  maxLap: number;
}

export function useFastestLap() {
  const ref = useRef<FastestLapState | null>(null);
  const [fastestLapDriver, setFastestLapDriver] = useState<number | null>(null);
  const [currentLap, setCurrentLap] = useState<number>(0);

  const processLaps = useCallback((laps: Lap[]): UseFastestLapResult => {
    for (const lap of laps) {
      if (lap.lap_duration == null) continue;
      if (!ref.current || lap.lap_duration < ref.current.time) {
        ref.current = {
          time: lap.lap_duration,
          driver: lap.driver_number,
          maxLap: Math.max(ref.current?.maxLap ?? 0, lap.lap_number ?? 0),
        };
      }
    }

    if (!ref.current) return { fastestLapDriver: null, currentLap: 0 };

    // Update maxLap to avoid re-processing old data
    const newMax = Math.max(...laps.map((l) => l.lap_number ?? 0), ref.current.maxLap);
    if (newMax > (ref.current.maxLap ?? 0)) {
      ref.current = { ...ref.current, maxLap: newMax };
    }

    // Only trigger re-renders when values actually change
    const flDriver = ref.current?.driver ?? null;
    const cl = ref.current?.maxLap ?? 0;
    return { fastestLapDriver: flDriver, currentLap: cl };
  }, []);

  return { processLaps, fastestLapDriver, setFastestLapDriver, currentLap, setCurrentLap };
}
