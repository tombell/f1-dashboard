import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getDrivers,
  getPositions,
  getIntervals,
  getWeather,
  getPitStops,
  getStints,
  getRaceControl,
} from "@/shared/api/openf1";
import BlankSlate from "@/shared/components/BlankSlate";
import Header from "@/shared/components/Header";
import RaceControl from "@/shared/components/RaceControl";
import TeamRadio from "@/shared/components/TeamRadio";
import type { Driver, Position, Interval, WeatherReading, Stint, Lap } from "@/shared/types/api";

import PracticeTiming from "../components/live/PracticeTiming";
import TimingTower from "../components/live/TimingTower";
import TrackClock from "../components/live/TrackClock";
import TrackMap from "../components/live/TrackMap";
import WeatherBar from "../components/live/WeatherBar";
import { useDriverFallback } from "../hooks/useDriverFallback";
import { useFastestLap } from "../hooks/useFastestLap";
import { useLiveSession } from "../hooks/useLiveSession";
import { usePenalties } from "../hooks/usePenalties";
import { usePitDetection } from "../hooks/usePitDetection";
import { usePositionChanges } from "../hooks/usePositionChanges";
import { useRetirements } from "../hooks/useRetirements";
import { useTyres } from "../hooks/useTyres";

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
  const [laps, setLaps] = useState<Lap[]>([]);
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
        const lapsData: Lap[] = await (
          await fetch(`/v1/laps?session_key=${sk}&lap_number>=0`)
        ).json();
        const { fastestLapDriver: flDriver, currentLap: cl } = processLaps(lapsData);
        setLaps(lapsData);
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

  const displayError = session ? error : null;
  const blankSlateTitle = sessionKey ? "Session not available" : "No active session";
  const blankSlateMessage =
    sessionError ?? "Live timing will appear here when a session is active.";

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-screen">
      <Header session={session} currentLap={currentLap} activeView="live" />
      {session && (
        <div className="flex items-center gap-3 flex-wrap">
          <WeatherBar weather={latestWeather} />
          <TrackClock />
        </div>
      )}
      {displayError && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {displayError}
        </div>
      )}
      {!session ? (
        <BlankSlate title={blankSlateTitle} icon="🏎️">
          {blankSlateMessage}
        </BlankSlate>
      ) : (
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
            driverLaps={driverLaps}
          />
          <div className="flex flex-col gap-3">
            <TrackMap session={session} drivers={drivers} />
            <RaceControl sessionKey={session.session_key} />
            <TeamRadio sessionKey={session.session_key} drivers={driverNameMap} />
          </div>
        </div>
      )}
      {session?.session_type === "Practice" && <PracticeTiming sessionKey={session.session_key} />}
    </div>
  );
}
