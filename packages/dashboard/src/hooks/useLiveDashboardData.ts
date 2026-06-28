import { useEffect, useMemo, useState } from "react";

import {
  getDrivers,
  getPositions,
  getIntervals,
  getWeather,
  getPitStops,
  getStints,
  getRaceControl,
  getLaps,
} from "@/shared/api/openf1";
import type {
  Driver,
  Position,
  Interval,
  WeatherReading,
  Stint,
  Lap,
  RaceControlMessage,
  Session,
} from "@/shared/types/api";

import { useDriverFallback } from "./useDriverFallback";
import { useFastestLap } from "./useFastestLap";
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
  const { processLaps, fastestLapDriver, setFastestLapDriver, currentLap, setCurrentLap } =
    useFastestLap();
  const { positionChanges, detectChanges } = usePositionChanges();
  const { recentPits, detectPits } = usePitDetection();
  const { retiredDrivers, detectRetirements } = useRetirements();
  const currentTyres = useTyres(stints, currentLap);
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

        const { fastestLapDriver: flDriver, currentLap: cl } = processLaps(lapsData);
        setLaps(lapsData);
        if (flDriver !== null) setFastestLapDriver(flDriver);
        if (cl > 0) setCurrentLap(cl);

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
  }, [
    session,
    enrichDrivers,
    processLaps,
    setFastestLapDriver,
    setCurrentLap,
    detectChanges,
    detectPits,
    detectRetirements,
  ]);

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

  const driverLaps = useMemo(() => {
    const map = new Map<number, { laps: number; bestLap: number | null }>();
    const byDriver = new Map<number, Lap[]>();
    for (const lap of laps) {
      if (!byDriver.has(lap.driver_number)) {
        byDriver.set(lap.driver_number, []);
      }
      byDriver.get(lap.driver_number)!.push(lap);
    }
    for (const [dn, dl] of byDriver) {
      const clean = dl.filter((l) => l.lap_duration != null && !l.is_pit_out_lap);
      const best = clean.reduce(
        (b, l) => (l.lap_duration != null && l.lap_duration < b ? l.lap_duration : b),
        Infinity,
      );
      map.set(dn, {
        laps: clean.length,
        bestLap: best !== Infinity ? best : null,
      });
    }
    return map;
  }, [laps]);

  return {
    currentLap,
    currentTyres,
    driverLaps,
    driverNameMap,
    driverPenalties,
    drivers,
    error,
    fastestLapDriver,
    intervals,
    latestPositions,
    latestWeather,
    positionChanges,
    recentPits,
    retiredDrivers,
  };
}
