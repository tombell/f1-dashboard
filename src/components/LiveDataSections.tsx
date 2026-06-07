import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import {
  getLaps,
  getPitStops,
  getStints,
  getWeather,
  getRaceControl,
  getPositions,
  getDrivers,
} from "@/api/openf1";
import type {
  Lap,
  PitStop,
  Stint,
  WeatherReading,
  RaceControlMessage,
  Position,
  Driver,
} from "@/types/api";

import RaceControl from "./RaceControl";
import WeatherChart from "./WeatherChart";

interface LiveDataSectionsProps {
  sessionKey: number;
  meetingKey: number;
  sessionName?: string;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#ff3333",
  MEDIUM: "#ffd600",
  HARD: "#cccccc",
  INTERMEDIATE: "#4caf50",
  WET: "#2196f3",
  SUPERSOFT: "#ff0000",
  ULTRASOFT: "#ff69b4",
  HYPERSOFT: "#ff1493",
};

function compoundColor(compound: string): string {
  const norm = compound?.toUpperCase() || "";
  return COMPOUND_COLORS[norm] || "#888";
}

function DriverCell({
  driverNumber,
  driverMap,
}: {
  driverNumber: number;
  driverMap: Map<number, { name_acronym: string; team_name: string; team_colour: string }>;
}) {
  const info = driverMap.get(driverNumber);
  if (!info) return <span className="text-xs font-semibold text-f1-bright">#{driverNumber}</span>;
  return (
    // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
    <span
      className="text-xs font-semibold"
      style={{ color: info.team_colour ? `#${info.team_colour}` : undefined }}
    >
      {info.name_acronym}
      <span className="ml-1.5 text-[11px] text-f1-dim font-normal">· {info.team_name}</span>
    </span>
  );
}

export default function LiveDataSections({
  sessionKey,
  _meetingKey,
  sessionName,
}: LiveDataSectionsProps) {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [pits, setPits] = useState<PitStop[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [_raceControl, setRaceControl] = useState<RaceControlMessage[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [driverMap, setDriverMap] = useState<
    Map<number, { name_acronym: string; team_name: string; team_colour: string }>
  >(new Map());
  const driverFallback = useRef<Map<
    number,
    { name_acronym: string; team_name: string; team_colour: string }
  > | null>(null);

  const handleToggle = useCallback((k: string) => {
    setCollapsed((c) => ({ ...c, [k]: !(c[k] ?? true) }));
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    let mounted = true;

    const fetchLiveData = async () => {
      try {
        const [l, p, s, w, rc, pos, drs] = await Promise.all([
          getLaps(sessionKey).catch(() => []),
          getPitStops(sessionKey).catch(() => []),
          getStints(sessionKey).catch(() => []),
          getWeather(sessionKey).catch(() => []),
          getRaceControl(sessionKey).catch(() => []),
          getPositions(sessionKey).catch(() => []),
          getDrivers(sessionKey).catch(() => [] as Driver[]),
        ]);
        if (!mounted) return;
        setLaps(l);
        setPits(p);
        setStints(s);
        setWeather(w);
        setRaceControl(rc);
        setPositions(pos);

        // Build driver name map
        const nameMap = new Map<
          number,
          { name_acronym: string; team_name: string; team_colour: string }
        >();
        for (const d of drs) {
          if (!nameMap.has(d.driver_number)) {
            nameMap.set(d.driver_number, {
              name_acronym: d.name_acronym,
              team_name: d.team_name,
              team_colour: d.team_colour,
            });
          }
        }

        // Fallback if per-session drivers are sparse
        if (nameMap.size < 10) {
          if (!driverFallback.current) {
            try {
              const allDrivers = await getDrivers();
              driverFallback.current = new Map();
              for (const d of allDrivers) {
                if (!driverFallback.current.has(d.driver_number)) {
                  driverFallback.current.set(d.driver_number, {
                    name_acronym: d.name_acronym,
                    team_name: d.team_name,
                    team_colour: d.team_colour,
                  });
                }
              }
            } catch {
              // fallback failed
            }
          }
          if (driverFallback.current) {
            for (const [dn, info] of driverFallback.current) {
              if (!nameMap.has(dn)) nameMap.set(dn, info);
            }
          }
        }

        setDriverMap(nameMap);
      } catch {
        // silent
      }
    };

    fetchLiveData();
    return () => {
      mounted = false;
    };
  }, [sessionKey]);

  // Process laps into per-driver summaries
  const lapSummaries = useMemo(() => {
    const driverLaps = new Map<number, Lap[]>();
    for (const lap of laps) {
      if (!driverLaps.has(lap.driver_number)) {
        driverLaps.set(lap.driver_number, []);
      }
      driverLaps.get(lap.driver_number)!.push(lap);
    }

    return [...driverLaps.entries()].map(([dn, dl]) => {
      const cleanLaps = dl.filter((l) => l.lap_duration != null && !l.is_pit_out_lap);
      const fastest = cleanLaps.reduce(
        (best, l) => (l.lap_duration != null && l.lap_duration < best ? l.lap_duration : best),
        Infinity,
      );
      const avg =
        cleanLaps.length > 0
          ? cleanLaps.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / cleanLaps.length
          : 0;
      const topSpeed = Math.max(...dl.map((l) => l.st_speed_trap ?? 0), 0);
      return {
        driver_number: dn,
        fastest: fastest !== Infinity ? fastest : null,
        average: avg || null,
        cleanCount: cleanLaps.length,
        totalLaps: dl.length,
        topSpeed: topSpeed > 0 ? topSpeed : null,
      };
    });
  }, [laps]);

  // Process stints by driver
  const stintsByDriver = useMemo(() => {
    const map = new Map<number, Stint[]>();
    for (const s of stints) {
      if (!map.has(s.driver_number)) map.set(s.driver_number, []);
      map.get(s.driver_number)!.push(s);
    }
    return map;
  }, [stints]);

  // Position changes per driver
  const posChanges = useMemo(() => {
    const changes = new Map<number, { start: number | null; end: number | null }>();
    for (const pos of positions) {
      if (!changes.has(pos.driver_number)) {
        changes.set(pos.driver_number, { start: null, end: null });
      }
      const entry = changes.get(pos.driver_number)!;
      if (entry.start === null) entry.start = pos.position;
      entry.end = pos.position;
    }
    return changes;
  }, [positions]);

  const dataAvailable =
    laps.length > 0 || pits.length > 0 || stints.length > 0 || weather.length > 0;

  if (!dataAvailable) return null;

  const hasLaps = laps.length > 0;
  const hasPits = pits.length > 0;
  const hasStints = stints.length > 0;
  const hasWeather = weather.length > 0;
  const hasPositionChanges = positions.length > 0;
  const isRace = sessionName === "Race";

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="text-xs text-f1-dim font-semibold uppercase tracking-wider">📊 Live Data</div>

      {/* Lap Times */}
      {hasLaps && (
        <LiveSection
          title="🏁 Lap Times"
          sectionKey="laps"
          collapsed={collapsed}
          onToggle={handleToggle}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Fastest</th>
                <th className="px-3 py-2 text-left">Avg</th>
                <th className="px-3 py-2 text-left">Clean</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Top Speed</th>
              </tr>
            </thead>
            <tbody>
              {lapSummaries.map((ls) => (
                <tr
                  key={ls.driver_number}
                  className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
                >
                  <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                    <DriverCell driverNumber={ls.driver_number} driverMap={driverMap} />
                  </td>
                  <td className="px-3 py-2 text-xs text-f1-green tabular-nums">
                    {ls.fastest ? `${ls.fastest.toFixed(3)}s` : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">
                    {ls.average ? `${ls.average.toFixed(3)}s` : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-f1-dim">{ls.cleanCount}</td>
                  <td className="px-3 py-2 text-xs text-f1-dim">{ls.totalLaps}</td>
                  <td className="px-3 py-2 text-xs text-f1-blue tabular-nums">
                    {ls.topSpeed ? `${ls.topSpeed} km/h` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LiveSection>
      )}

      {/* Pit Stops */}
      {hasPits && (
        <LiveSection
          title="🛑 Pit Stops"
          sectionKey="pits"
          collapsed={collapsed}
          onToggle={handleToggle}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Lap</th>
                <th className="px-3 py-2 text-left">Stop</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Lane</th>
                <th className="px-3 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {pits
                .slice(-50)
                .toReversed()
                .map((p) => (
                  <tr
                    key={`${p.driver_number}_${p.lap_number}_${p.pit_duration}`}
                    className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
                  >
                    <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                      <DriverCell driverNumber={p.driver_number} driverMap={driverMap} />
                    </td>
                    <td className="px-3 py-2 text-xs">L{p.lap_number}</td>
                    <td className="px-3 py-2 text-xs text-f1-dim">
                      {p.pit_duration != null ? `${p.pit_duration.toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-f1-dim">
                      {p.stop_time != null ? `${p.stop_time.toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-f1-dim">
                      {p.lane_time != null ? `${p.lane_time.toFixed(1)}s` : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.tyre_change ? (
                        <span className="text-f1-yellow">Tyre change</span>
                      ) : (
                        <span className="text-f1-dim">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </LiveSection>
      )}

      {/* Tyre Stints + Lap Chart */}
      {hasStints && (
        <LiveSection
          title="🏎️ Tyre Stints"
          sectionKey="stints"
          collapsed={collapsed}
          onToggle={handleToggle}
        >
          <div className="divide-y divide-f1-border">
            {(() => {
              // Compute max total laps across all drivers for a consistent scale
              const driverLapTotals = [...stintsByDriver.entries()].map(([dn, driverStints]) => ({
                dn,
                stints: [...driverStints].toSorted((a, b) => a.stint_number - b.stint_number),
                total: driverStints.reduce((s, st) => s + (st.lap_end - st.lap_start + 1), 0),
              }));
              const maxTotal = Math.max(...driverLapTotals.map((d) => d.total), 1);

              return driverLapTotals
                .toSorted((a, b) => (a.stints[0]?.lap_start ?? 0) - (b.stints[0]?.lap_start ?? 0))
                .map(({ dn, stints: sorted, total: _totalLaps }) => {
                  // Build lap → compound map
                  const lapCompound = new Map<number, string>();
                  for (const st of sorted) {
                    for (let n = st.lap_start; n <= st.lap_end; n++) {
                      lapCompound.set(n, st.compound);
                    }
                  }

                  // Get this driver's laps for the mini chart
                  const driverLaps = laps
                    .filter((l) => l.driver_number === dn && l.lap_duration != null && !l.is_pitlap)
                    .toSorted((a, b) => a.lap_number - b.lap_number);
                  const fastestLap = driverLaps.reduce(
                    (best, l) => (l.lap_duration! < best ? l.lap_duration! : best),
                    Infinity,
                  );

                  return (
                    <div key={dn} className="px-4 py-3">
                      {/* Driver header */}
                      <div className="mb-2">
                        <DriverCell driverNumber={dn} driverMap={driverMap} />
                      </div>

                      {/* Stint bar */}
                      <div className="flex h-6 rounded overflow-hidden mb-1.5">
                        {sorted.map((st, idx) => {
                          const pct = ((st.lap_end - st.lap_start + 1) / maxTotal) * 100;
                          return (
                            <div
                              key={st.stint_number}
                              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                              style={{
                                width: `${pct}%`,
                                backgroundColor: compoundColor(st.compound),
                                opacity: 0.6,
                                marginLeft: idx > 0 ? 2 : 0,
                                borderRadius:
                                  sorted.length === 1
                                    ? undefined
                                    : idx === 0
                                      ? "4px 0 0 4px"
                                      : idx === sorted.length - 1
                                        ? "0 4px 4px 0"
                                        : undefined,
                              }}
                              className="flex items-center justify-center text-[10px] font-bold text-black/70 border-r border-black/10 last:border-r-0 shrink-0"
                              title={`${st.compound} L${st.lap_start}–${st.lap_end}`}
                            >
                              {pct > 12 ? st.compound : ""}
                            </div>
                          );
                        })}
                      </div>

                      {/* Stint labels */}
                      <div className="flex gap-2 text-[10px] text-f1-dim mb-2 flex-wrap">
                        {sorted.map((st) => {
                          return (
                            <span key={st.stint_number}>
                              {/* eslint-disable-next-line react-perf/jsx-no-new-object-as-prop */}
                              <span
                                className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                                style={{
                                  backgroundColor: compoundColor(st.compound),
                                  opacity: 0.6,
                                }}
                              />
                              {st.compound} L{st.lap_start}–{st.lap_end}
                            </span>
                          );
                        })}
                      </div>

                      {/* Lap time mini chart — only for Race sessions */}
                      {isRace && driverLaps.length > 1 && fastestLap < Infinity && (
                        <div className="flex items-end gap-[1px] h-8">
                          {driverLaps.map((l) => {
                            const comp = lapCompound.get(l.lap_number) || "";
                            const ratio = fastestLap / l.lap_duration!;
                            const height = Math.max(4, Math.round(ratio * 28));
                            return (
                              <div
                                key={l.lap_number}
                                className="w-[3px] rounded-t-sm shrink-0"
                                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                                style={{
                                  height: `${height}px`,
                                  backgroundColor: compoundColor(comp),
                                  opacity: comp ? 0.55 : 0.3,
                                }}
                                title={`L${l.lap_number}: ${l.lap_duration?.toFixed(3)}s ${comp}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
            })()}
          </div>
        </LiveSection>
      )}

      {/* Weather History */}
      {hasWeather && (
        <LiveSection
          title="🌤️ Weather History"
          sectionKey="weather"
          collapsed={collapsed}
          onToggle={handleToggle}
        >
          <WeatherChart data={weather} />
        </LiveSection>
      )}

      {/* Position Changes */}
      {hasPositionChanges && (
        <LiveSection
          title="📊 Position Changes"
          sectionKey="positions"
          collapsed={collapsed}
          onToggle={handleToggle}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">End</th>
                <th className="px-3 py-2 text-left">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...posChanges.entries()]
                .toSorted(([, a], [, b]) => (a.start ?? 99) - (b.start ?? 99))
                .map(([dn, ch]) => {
                  const net = ch.start != null && ch.end != null ? ch.start - ch.end : 0;
                  return (
                    <tr
                      key={dn}
                      className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
                    >
                      <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                        <DriverCell driverNumber={dn} driverMap={driverMap} />
                      </td>
                      <td className="px-3 py-2 text-xs text-f1-dim">
                        {ch.start != null ? `P${ch.start}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-f1-dim">
                        {ch.end != null ? `P${ch.end}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        {net > 0 ? (
                          <span className="text-f1-green">▲{net}</span>
                        ) : net < 0 ? (
                          <span className="text-f1-red">▼{Math.abs(net)}</span>
                        ) : (
                          <span className="text-f1-dim">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </LiveSection>
      )}

      {/* Race Control Log */}
      <LiveSection
        title="🚩 Race Control"
        sectionKey="rc"
        collapsed={collapsed}
        onToggle={handleToggle}
      >
        <RaceControl sessionKey={sessionKey} />
      </LiveSection>
    </div>
  );
}

function LiveSection({
  title,
  sectionKey,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}) {
  const isCollapsed = collapsed[sectionKey] ?? true;
  const handleClick = useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") onToggle(sectionKey);
    },
    [onToggle, sectionKey],
  );

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      <button
        onClick={handleClick}
        type="button"
        className="w-full text-left text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center cursor-pointer select-none bg-transparent border-t-0 border-x-0 font-inherit"
        onKeyDown={handleKeyDown}
      >
        <span>{title}</span>
        <span className="text-f1-dim text-[11px] hover:bg-f1-bg4 px-1.5 py-0.5 rounded transition-colors">
          {isCollapsed ? "▶" : "▼"}
        </span>
      </button>
      {!isCollapsed && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}
