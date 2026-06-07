import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import WeatherBar from "@/components/WeatherBar";
import TimingTower from "@/components/TimingTower";
import RaceControl from "@/components/RaceControl";
import TeamRadio from "@/components/TeamRadio";
import TrackClock from "@/components/TrackClock";
import { getLatestSession, getDrivers, getPositions, getIntervals, getWeather, getPitStops, getStints } from "@/api/openf1";
import type { Session, Driver, Position, Interval, WeatherReading, PitStop, Stint } from "@/types/api";

export default function LiveDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [positionChanges, setPositionChanges] = useState<Map<number, "up" | "down">>(new Map());
  const [recentPits, setRecentPits] = useState<Set<number>>(new Set());
  const [fastestLapDriver, setFastestLapDriver] = useState<number | null>(null);
  const [currentLap, setCurrentLap] = useState<number>(0);
  const [currentTyres, setCurrentTyres] = useState<Map<number, string>>(new Map());
  const [searchParams] = useSearchParams();
  const driverFallback = useRef<Map<number, Driver> | null>(null);
  const prevPositions = useRef<Map<number, number> | null>(null);
  const prevPitCounts = useRef<Map<number, number>>(new Map());
  const fastestLapRef = useRef<{ time: number; driver: number; maxLap: number } | null>(null);

  const sessionKey = searchParams.get("session") ? Number(searchParams.get("session")) : undefined;

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(
      async () => {
        try {
          const s = sessionKey
            ? await (await fetch(`/v1/sessions?session_key=${sessionKey}`)).json()
            : await getLatestSession();
          const sess = Array.isArray(s) ? s[0] : s;
          if (!sess) return;
          if (!mounted) return;
          setSession(sess);

          const sk = sess.session_key;
          let [d, p, i, w, pits, stints] = await Promise.all([
            getDrivers(sk),
            getPositions(sk),
            getIntervals(sk),
            getWeather(sk),
            getPitStops(sk),
            getStints(sk),
          ]);

          // Enrich sparse driver data with fallback driver registry
          if (d.length < 10) {
            if (!driverFallback.current) {
              try {
                const allDrivers = await getDrivers();
                driverFallback.current = new Map();
                for (const dr of allDrivers) {
                  if (!driverFallback.current.has(dr.driver_number)) {
                    driverFallback.current.set(dr.driver_number, dr);
                  }
                }
              } catch {
                // fallback failed
              }
            }
            if (driverFallback.current) {
              d = d.map((dr) => {
                const fb = driverFallback.current!.get(dr.driver_number);
                if (fb) {
                  dr.broadcast_name = dr.broadcast_name || fb.broadcast_name;
                  dr.full_name = dr.full_name || fb.full_name;
                  dr.team_name = dr.team_name || fb.team_name;
                  dr.team_colour = dr.team_colour || fb.team_colour;
                  dr.name_acronym = dr.name_acronym || fb.name_acronym;
                }
                return dr;
              });
            }
          }

          if (!mounted) return;
          setDrivers(d);

          // Track fastest lap
          const maxLap = fastestLapRef.current?.maxLap ?? 0;
          try {
            const lapData = await (await fetch(`/v1/laps?session_key=${sk}&lap_number>=${maxLap}`)).json();
            if (Array.isArray(lapData) && lapData.length > 0) {
              for (const lap of lapData) {
                if (lap.lap_duration == null) continue;
                if (
                  !fastestLapRef.current ||
                  lap.lap_duration < fastestLapRef.current.time
                ) {
                  fastestLapRef.current = {
                    time: lap.lap_duration,
                    driver: lap.driver_number,
                    maxLap: Math.max(fastestLapRef.current?.maxLap ?? 0, lap.lap_number),
                  };
                }
              }
              if (!fastestLapRef.current) {
                // No valid laps yet
              } else {
                // Update maxLap to avoid re-fetching old data
                const newMax = Math.max(...lapData.map((l: any) => l.lap_number ?? 0));
                if (newMax > (fastestLapRef.current.maxLap ?? 0)) {
                  fastestLapRef.current = { ...fastestLapRef.current, maxLap: newMax };
                }
              }
            }
          } catch {
            // silent — lap fetch is non-critical
          }
          const flDriver = fastestLapRef.current?.driver ?? null;
          if (flDriver !== fastestLapDriver) setFastestLapDriver(flDriver);
          const cl = fastestLapRef.current?.maxLap ?? 0;
          if (cl !== currentLap) setCurrentLap(cl);

          // Detect position changes
          const newPosMap = new Map<number, number>();
          for (const pos of p) {
            newPosMap.set(pos.driver_number, pos.position);
          }
          if (prevPositions.current && prevPositions.current.size > 0) {
            const changes = new Map<number, "up" | "down">();
            for (const [dn, newPos] of newPosMap) {
              const oldPos = prevPositions.current.get(dn);
              if (oldPos !== undefined && oldPos !== newPos) {
                changes.set(dn, newPos < oldPos ? "up" : "down");
              }
            }
            if (changes.size > 0) {
              setPositionChanges(changes);
              setTimeout(() => {
                setPositionChanges(new Map());
              }, 4000);
            }
          }
          prevPositions.current = newPosMap;

          // Detect new pit stops
          const pitCounts = new Map<number, number>();
          for (const pit of pits) {
            pitCounts.set(pit.driver_number, (pitCounts.get(pit.driver_number) ?? 0) + 1);
          }
          const newPits = new Set<number>();
          for (const [dn, count] of pitCounts) {
            const prev = prevPitCounts.current.get(dn) ?? 0;
            if (count > prev) {
              newPits.add(dn);
            }
          }
          if (newPits.size > 0) {
            setRecentPits(newPits);
            setTimeout(() => setRecentPits(new Set()), 20000);
          }
          prevPitCounts.current = pitCounts;

          // Derive current tyre compound for each driver
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
          setCurrentTyres(tyreMap);

          setPositions(p);
          setIntervals(i);
          setWeather(w);
          setError(null);
        } catch (e: unknown) {
          if (!mounted) return;
          setError(e instanceof Error ? e.message : "Connection error");
        }
      },
      sessionKey ? 5000 : 3000,
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;
  const latestPositions = positions.reduce((map, p) => {
    map.set(p.driver_number, p);
    return map;
  }, new Map<number, Position>());
  const driverNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of drivers) {
      map.set(d.driver_number, d.name_acronym);
    }
    return map;
  }, [drivers]);

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-screen">
      <Header session={session} currentLap={currentLap} onRefresh={() => setError(null)} />
      <div className="flex items-center gap-3 flex-wrap">
        <WeatherBar weather={latestWeather} />
        <TrackClock />
      </div>
      {error && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {error}
        </div>
      )}
      <div className="flex-1 grid grid-cols-[1fr_2fr] gap-3 min-h-0 max-lg:grid-cols-1">
        <TimingTower drivers={drivers} positions={latestPositions} intervals={intervals} positionChanges={positionChanges} recentPits={recentPits} fastestLapDriver={fastestLapDriver} currentTyres={currentTyres} />
        <RaceControl sessionKey={session?.session_key} />
      </div>
      <TeamRadio sessionKey={session?.session_key} drivers={driverNameMap} />
    </div>
  );
}
