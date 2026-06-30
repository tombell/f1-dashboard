import { useEffect, useMemo, useState } from "react";

import {
  getDrivers,
  getIntervals,
  getLaps,
  getPitStops,
  getPositions,
  getRaceControl,
  getStints,
  getWeather,
} from "@/shared/api/openf1";
import type {
  Driver,
  Interval,
  Lap,
  Position,
  RaceControlMessage,
  Session,
  Stint,
  WeatherReading,
} from "@/shared/types/api";
import { summarizeLaps } from "@/shared/utils/laps";

import { useDriverFallback } from "./useDriverFallback";
import { usePenalties } from "./usePenalties";
import { usePitDetection } from "./usePitDetection";
import { usePositionChanges } from "./usePositionChanges";
import { useRetirements } from "./useRetirements";
import { useTyres } from "./useTyres";

export function useLiveDashboardData(session: Session | null) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rc, setRc] = useState<RaceControlMessage[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);

  const { enrichDrivers } = useDriverFallback();
  const { positionChanges, detectChanges } = usePositionChanges();
  const { recentPits, detectPits } = usePitDetection();
  const { retiredDrivers, detectRetirements } = useRetirements();
  const lapSummary = useMemo(() => summarizeLaps(laps), [laps]);
  const currentTyres = useTyres(stints, lapSummary.currentLap);
  const driverPenalties = usePenalties(rc);

  useEffect(() => {
    if (!session) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const sk = session.session_key;
        const [d, p, i, w, pits, s, rcData, lapsData] = await Promise.all([
          getDrivers(sk),
          getPositions(sk),
          getIntervals(sk),
          getWeather(sk),
          getPitStops(sk),
          getStints(sk),
          getRaceControl(sk),
          getLaps(sk),
        ]);
        if (!mounted) return;

        const { drivers: enriched } = await enrichDrivers(d, session.meeting_key);
        if (!mounted) return;

        setDrivers(enriched);
        setPositions(p);
        setIntervals(i);
        setWeather(w);
        setStints(s);
        setRc(rcData);
        setError(null);

        setLaps(lapsData);

        detectChanges(p);
        detectPits(pits);
        detectRetirements(enriched, p, i, rcData, s);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Connection error");
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session, enrichDrivers, detectChanges, detectPits, detectRetirements]);

  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;
  const latestPositions = useMemo(() => {
    const map = new Map<number, Position>();
    for (const p of positions) {
      map.set(p.driver_number, p);
    }
    return map;
  }, [positions]);

  const driverNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of drivers) {
      map.set(d.driver_number, d.name_acronym);
    }
    return map;
  }, [drivers]);

  return {
    currentLap: lapSummary.currentLap,
    currentTyres,
    driverLaps: lapSummary.drivers,
    driverNameMap,
    driverPenalties,
    drivers,
    error,
    fastestLapDriver: lapSummary.fastestLapDriver,
    intervals,
    latestPositions,
    latestWeather,
    positionChanges,
    recentPits,
    retiredDrivers,
  };
}
