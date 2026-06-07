import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getLatestSession,
  getDrivers,
  getPositions,
  getIntervals,
  getWeather,
  getPitStops,
  getStints,
  getRaceControl,
} from "@/api/openf1";
import Header from "@/components/Header";
import RaceControl from "@/components/RaceControl";
import TeamRadio from "@/components/TeamRadio";
import TimingTower from "@/components/TimingTower";
import TrackClock from "@/components/TrackClock";
import WeatherBar from "@/components/WeatherBar";
import type {
  Session,
  Driver,
  Position,
  Interval,
  WeatherReading,
  PitStop,
  Stint,
} from "@/types/api";

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
  const [driverPenalties, setDriverPenalties] = useState<Map<number, string>>(new Map());
  const [searchParams] = useSearchParams();
  const driverFallback = useRef<Map<number, Driver> | null>(null);
  const prevPositions = useRef<Map<number, number> | null>(null);
  const prevPitCounts = useRef<Map<number, number>>(new Map());
  const fastestLapRef = useRef<{ time: number; driver: number; maxLap: number } | null>(null);
  const lastUpdateTimes = useRef<Map<number, number>>(new Map());
  const [retiredDrivers, setRetiredDrivers] = useState<Set<number>>(new Set());

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
          let [d, p, i, w, pits, stints, rc] = await Promise.all([
            getDrivers(sk),
            getPositions(sk),
            getIntervals(sk),
            getWeather(sk),
            getPitStops(sk),
            getStints(sk),
            getRaceControl(sk),
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
            const lapData = await (
              await fetch(`/v1/laps?session_key=${sk}&lap_number>=${maxLap}`)
            ).json();
            if (Array.isArray(lapData) && lapData.length > 0) {
              for (const lap of lapData) {
                if (lap.lap_duration == null) continue;
                if (!fastestLapRef.current || lap.lap_duration < fastestLapRef.current.time) {
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
          const isFirstRun = prevPitCounts.current.size === 0;
          for (const [dn, count] of pitCounts) {
            const prev = prevPitCounts.current.get(dn) ?? 0;
            if (count > prev) {
              newPits.add(dn);
            }
          }
          if (!isFirstRun && newPits.size > 0) {
            setRecentPits(newPits);
            setTimeout(() => setRecentPits(new Set()), 20000);
          }
          prevPitCounts.current = pitCounts;

          // Track last data update per driver and detect retirements
          // Use actual data timestamps (not poll time) so stale drivers aren't masked
          // by the API re-sending old records on every poll
          for (const pos of p) {
            const dateMs = new Date(pos.date).getTime();
            const prev = lastUpdateTimes.current.get(pos.driver_number) ?? 0;
            if (dateMs > prev) {
              lastUpdateTimes.current.set(pos.driver_number, dateMs);
            }
          }
          for (const iv of i) {
            const dateMs = new Date(iv.date).getTime();
            const prev = lastUpdateTimes.current.get(iv.driver_number) ?? 0;
            if (dateMs > prev) {
              lastUpdateTimes.current.set(iv.driver_number, dateMs);
            }
          }
          if (d.length > 0) {
            const staleTimeout = 180_000; // 3 min with no data = retired
            const activeTimeout = 120_000; // 2 min = session still live
            const now = Date.now();
            const stale = new Set<number>();
            for (const drv of d) {
              const lastUpd = lastUpdateTimes.current.get(drv.driver_number);
              if (lastUpd && now - lastUpd > staleTimeout) {
                stale.add(drv.driver_number);
              }
            }
            let sessionActive = false;
            for (const drv of d) {
              const lastUpd = lastUpdateTimes.current.get(drv.driver_number);
              if (lastUpd && now - lastUpd <= activeTimeout) {
                sessionActive = true;
                break;
              }
            }
            // Don't flag retirements during red flag (data stops for everyone)
            const isRedFlag =
              Array.isArray(rc) && rc.some((r: any) => (r.message || "").includes("RED FLAG"));
            if (isRedFlag) {
              // During red flag: compare lap counts to find genuine retirees.
              // Drivers who retired stopped lapping early; those who stopped for
              // the red flag are near the leader's lap count.
              const maxLap = Math.max(...stints.map((s: Stint) => s.lap_end ?? 0), 0);
              const stale = new Set<number>();
              for (const drv of d) {
                const driverStints = stints.filter(
                  (s: Stint) => s.driver_number === drv.driver_number,
                );
                if (driverStints.length === 0) continue;
                const lastLap = Math.max(...driverStints.map((s: Stint) => s.lap_end ?? 0), 0);
                // 3+ laps behind the leader = retired before the red flag
                if (lastLap > 0 && maxLap - lastLap >= 3) {
                  stale.add(drv.driver_number);
                }
              }
              setRetiredDrivers(new Set(stale));
            } else if (sessionActive) {
              setRetiredDrivers(new Set(stale));
            }
          }

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

          // Parse penalty status from race control messages
          const penalties = new Map<number, string>();
          if (Array.isArray(rc)) {
            // Extract driver number from message text when field is null
            const extractDriver = (entry: any): number | null => {
              if (entry.driver_number) return entry.driver_number;
              const match = (entry.message || "").match(/CAR\s+(\d+)/);
              return match ? parseInt(match[1]) : null;
            };
            // Process newest first to get latest status per driver
            const sorted = [...rc].reverse();
            for (const entry of sorted) {
              const dn = extractDriver(entry);
              if (!dn || penalties.has(dn)) continue;
              const msg = entry.message || "";
              if (msg.includes("UNDER INVESTIGATION")) {
                penalties.set(dn, "INVESTIGATION");
              } else if (
                msg.includes("TIME PENALTY") ||
                msg.includes("DRIVE THROUGH PENALTY") ||
                msg.includes("STOP-GO PENALTY")
              ) {
                if (!msg.includes("SERVED") && !msg.includes("PENALTY SERVED")) {
                  penalties.set(dn, "PENALTY");
                }
              }
            }
            // Check for served penalties or cleared investigations
            for (const entry of sorted) {
              const dn = extractDriver(entry);
              if (!dn) continue;
              const msg = entry.message || "";
              if (msg.includes("PENALTY SERVED") && penalties.get(dn) === "PENALTY") {
                penalties.delete(dn);
              }
              if (
                msg.includes("NO FURTHER INVESTIGATION") &&
                penalties.get(dn) === "INVESTIGATION"
              ) {
                penalties.delete(dn);
              }
            }
          }
          setDriverPenalties(penalties);

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
        <TimingTower
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
        <RaceControl sessionKey={session?.session_key} />
      </div>
      <TeamRadio sessionKey={session?.session_key} drivers={driverNameMap} />
    </div>
  );
}
