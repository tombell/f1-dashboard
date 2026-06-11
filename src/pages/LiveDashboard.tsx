import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getDrivers,
  getPositions,
  getIntervals,
  getWeather,
  getPitStops,
  getStints,
  getRaceControl,
} from "@/api/openf1";
import RaceControl from "@/components/live/RaceControl";
import TeamRadio from "@/components/live/TeamRadio";
import TimingTower from "@/components/live/TimingTower";
import TrackClock from "@/components/live/TrackClock";
import TrackMap from "@/components/live/TrackMap";
import WeatherBar from "@/components/live/WeatherBar";
import Header from "@/components/shared/Header";
import { useDriverFallback } from "@/hooks/useDriverFallback";
import { useFastestLap } from "@/hooks/useFastestLap";
import { useLiveSession } from "@/hooks/useLiveSession";
import { usePenalties } from "@/hooks/usePenalties";
import { usePitDetection } from "@/hooks/usePitDetection";
import { usePositionChanges } from "@/hooks/usePositionChanges";
import { useRetirements } from "@/hooks/useRetirements";
import { useTyres } from "@/hooks/useTyres";
import type { Driver, Position, Interval, WeatherReading, Stint } from "@/types/api";

export default function LiveDashboard() {
  const [searchParams] = useSearchParams();
  const sessionKey = searchParams.get("session") ? Number(searchParams.get("session")) : undefined;

  const { session, error: sessionError } = useLiveSession(sessionKey);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { enrichDrivers } = useDriverFallback();
  const { processLaps, fastestLapDriver, setFastestLapDriver, currentLap, setCurrentLap } =
    useFastestLap();
  const { positionChanges, detectChanges } = usePositionChanges();
  const { recentPits, detectPits } = usePitDetection();
  const { retiredDrivers, detectRetirements } = useRetirements();
  const [rc, setRc] = useState<any[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const currentTyres = useTyres(stints, currentLap);
  const driverPenalties = usePenalties(rc);

  // Data polling
  useEffect(() => {
    if (!session) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        const sk = session.session_key;
        const [d, p, i, w, pits, s, rcData] = await Promise.all([
          getDrivers(sk),
          getPositions(sk),
          getIntervals(sk),
          getWeather(sk),
          getPitStops(sk),
          getStints(sk),
          getRaceControl(sk),
        ]);
        if (!mounted) return;

        // Enrich drivers with meeting-scoped fallback
        const { drivers: enriched } = await enrichDrivers(d, session.meeting_key);

        setDrivers(enriched);
        setPositions(p);
        setIntervals(i);
        setWeather(w);
        setStints(s);
        setRc(rcData);
        setError(null);

        // Process derived state
        const { fastestLapDriver: flDriver, currentLap: cl } = processLaps(
          await (await fetch(`/v1/laps?session_key=${sk}&lap_number>=0`)).json(),
        );
        if (flDriver !== null) setFastestLapDriver(flDriver);
        if (cl > 0) setCurrentLap(cl);

        detectChanges(p);
        detectPits(pits);
        detectRetirements(enriched, p, rcData, s);
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

  const handleRefresh = useCallback(() => setError(null), []);

  const displayError = sessionError || error;

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-screen">
      <Header session={session} currentLap={currentLap} onRefresh={handleRefresh} />
      <div className="flex items-center gap-3 flex-wrap">
        <WeatherBar weather={latestWeather} />
        <TrackClock />
      </div>
      {displayError && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {displayError}
        </div>
      )}
      <div className="flex-1 grid grid-cols-[1fr_2fr] gap-3 min-h-0 max-lg:grid-cols-1">
        <TimingTower
          session={session}
          drivers={drivers}
          positions={latestPositions}
          intervals={intervals}
          positionChanges={positionChanges}
          recentPits={recentPits}
          fastestLapDriver={fastestLapDriver}
          currentTyres={currentTyres}
          retiredDrivers={retiredDrivers}
          driverPenalties={driverPenalties}
        />
        <div className="flex flex-col gap-3">
          <TrackMap session={session} drivers={drivers} />
          <RaceControl sessionKey={session?.session_key} />
        </div>
      </div>
      <TeamRadio sessionKey={session?.session_key} drivers={driverNameMap} />
    </div>
  );
}
