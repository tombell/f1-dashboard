import { useState, useEffect, useMemo } from "react";
import {
  getLaps,
  getPitStops,
  getStints,
  getWeather,
  getRaceControl,
  getPositions,
} from "@/api/openf1";
import type {
  Lap,
  PitStop,
  Stint,
  WeatherReading,
  RaceControlMessage,
  Position,
} from "@/types/api";
import RaceControl from "./RaceControl";

interface LiveDataSectionsProps {
  sessionKey: number;
  meetingKey: number;
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

export default function LiveDataSections({ sessionKey, meetingKey }: LiveDataSectionsProps) {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [pits, setPits] = useState<PitStop[]>([]);
  const [stints, setStints] = useState<Stint[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [raceControl, setRaceControl] = useState<RaceControlMessage[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!sessionKey) return;
    let mounted = true;

    const fetchLiveData = async () => {
      try {
        const [l, p, s, w, rc, pos] = await Promise.all([
          getLaps(sessionKey).catch(() => []),
          getPitStops(sessionKey).catch(() => []),
          getStints(sessionKey).catch(() => []),
          getWeather(sessionKey).catch(() => []),
          getRaceControl(sessionKey).catch(() => []),
          getPositions(sessionKey).catch(() => []),
        ]);
        if (!mounted) return;
        setLaps(l);
        setPits(p);
        setStints(s);
        setWeather(w);
        setRaceControl(rc);
        setPositions(pos);
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

    return [...driverLaps.entries()].map(([dn, driverLaps]) => {
      const cleanLaps = driverLaps.filter((l) => l.lap_duration != null && !l.is_pit_out_lap);
      const fastest = cleanLaps.reduce(
        (best, l) => (l.lap_duration != null && l.lap_duration < best ? l.lap_duration : best),
        Infinity,
      );
      const avg =
        cleanLaps.length > 0
          ? cleanLaps.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / cleanLaps.length
          : 0;
      const topSpeed = Math.max(...driverLaps.map((l) => l.st_speed_trap ?? 0), 0);
      return {
        driver_number: dn,
        fastest: fastest !== Infinity ? fastest : null,
        average: avg || null,
        cleanCount: cleanLaps.length,
        totalLaps: driverLaps.length,
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

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="text-xs text-f1-dim font-semibold uppercase tracking-wider">📊 Live Data</div>

      {/* Lap Times */}
      {hasLaps && (
        <LiveSection
          title="🏁 Lap Times"
          sectionKey="laps"
          collapsed={collapsed}
          onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
          count={lapSummaries.length}
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
                    #{ls.driver_number}
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
          onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
          count={pits.length}
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
                .reverse()
                .map((p, i) => (
                  <tr key={i} className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3">
                    <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                      #{p.driver_number}
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

      {/* Tyre Stints */}
      {hasStints && (
        <LiveSection
          title="🏎️ Tyre Stints"
          sectionKey="stints"
          collapsed={collapsed}
          onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
          count={stintsByDriver.size}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Stint</th>
                <th className="px-3 py-2 text-left">Laps</th>
                <th className="px-3 py-2 text-left">Compound</th>
                <th className="px-3 py-2 text-left">Age</th>
              </tr>
            </thead>
            <tbody>
              {[...stintsByDriver.entries()].map(([dn, driverStints]) =>
                driverStints.map((s) => (
                  <tr
                    key={`${dn}-${s.stint_number}`}
                    className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
                  >
                    <td className="px-3 py-2 text-xs font-semibold text-f1-bright">#{dn}</td>
                    <td className="px-3 py-2 text-xs text-f1-dim">{s.stint_number}</td>
                    <td className="px-3 py-2 text-xs">
                      L{s.lap_start}–{s.lap_end}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-semibold" style={{ color: compoundColor(s.compound) }}>
                        {s.compound || s.compound_visual || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-f1-dim">{s.tyre_age_at_start} laps</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </LiveSection>
      )}

      {/* Weather History */}
      {hasWeather && (
        <LiveSection
          title="🌤️ Weather History"
          sectionKey="weather"
          collapsed={collapsed}
          onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
          count={weather.length}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Air</th>
                <th className="px-3 py-2 text-left">Track</th>
                <th className="px-3 py-2 text-left">Humidity</th>
                <th className="px-3 py-2 text-left">Wind</th>
                <th className="px-3 py-2 text-left">Rain</th>
              </tr>
            </thead>
            <tbody>
              {weather.slice(-120).map((w, i) => (
                <tr key={i} className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3">
                  <td className="px-3 py-2 text-xs text-f1-dim">
                    {new Date(w.date).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 text-xs">{w.air_temperature ?? "-"}°C</td>
                  <td className="px-3 py-2 text-xs">{w.track_temperature ?? "-"}°C</td>
                  <td className="px-3 py-2 text-xs">{w.humidity ?? "-"}%</td>
                  <td className="px-3 py-2 text-xs">{w.wind_speed ?? "-"} m/s</td>
                  <td className="px-3 py-2 text-xs">
                    {w.rainfall ? (
                      <span className="text-f1-blue">🌧️</span>
                    ) : (
                      <span className="text-f1-dim">☀️</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </LiveSection>
      )}

      {/* Position Changes */}
      {hasPositionChanges && (
        <LiveSection
          title="📊 Position Changes"
          sectionKey="positions"
          collapsed={collapsed}
          onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
          count={posChanges.size}
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
                .sort(([, a], [, b]) => (a.start ?? 99) - (b.start ?? 99))
                .map(([dn, ch]) => {
                  const net = ch.start != null && ch.end != null ? ch.start - ch.end : 0;
                  return (
                    <tr
                      key={dn}
                      className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
                    >
                      <td className="px-3 py-2 text-xs font-semibold text-f1-bright">#{dn}</td>
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
        onToggle={(k) => setCollapsed((c) => ({ ...c, [k]: !c[k] }))}
        count={raceControl.length}
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
  count,
  children,
}: {
  title: string;
  sectionKey: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  count: number;
  children: React.ReactNode;
}) {
  const isCollapsed = collapsed[sectionKey] ?? false;

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      <div
        onClick={() => onToggle(sectionKey)}
        className="text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center cursor-pointer select-none"
      >
        <span>
          {title} <span className="text-[11px] text-f1-dim font-normal">({count})</span>
        </span>
        <span className="text-f1-dim text-[11px] hover:bg-f1-bg4 px-1.5 py-0.5 rounded transition-colors">
          {isCollapsed ? "▶" : "▼"}
        </span>
      </div>
      {!isCollapsed && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
}
