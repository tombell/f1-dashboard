import { useState, useEffect, useMemo, useRef } from "react";
import { getSessionResults, getSessions, getDrivers } from "@/api/openf1";
import type { Meeting, Session, SessionResult } from "@/types/api";

interface StandingsViewProps {
  meetings: Meeting[];
  year: number;
}

interface PointsEntry {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  points: number;
  wins: number;
}

interface DriverInfo {
  broadcast_name: string;
  full_name: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  name_acronym: string;
}

const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const BATCH_SIZE = 5;

function calcPoints(position: number | null, hasFastestLap?: boolean): number {
  if (position == null) return 0;
  const base = POINTS_SYSTEM[position - 1] || 0;
  return base;
}

type LoadResult = {
  results: SessionResult[];
  drivers: Map<number, DriverInfo>;
} | null;

async function loadMeeting(mk: number): Promise<LoadResult> {
  try {
    const sessions = await getSessions(mk);
    const raceSession = sessions.find(
      (s) => s.session_type === "Race" && s.session_name !== "Sprint",
    );
    const sprintSession = sessions.find((s) => s.session_name === "Sprint");

    // Fetch race + sprint results in parallel
    const [raceSr, sprintSr] = await Promise.all([
      raceSession ? getSessionResults(mk, raceSession.session_key) : Promise.resolve([] as SessionResult[]),
      sprintSession && sprintSession.session_key !== raceSession?.session_key
        ? getSessionResults(mk, sprintSession.session_key)
        : Promise.resolve([] as SessionResult[]),
    ]);

    // Fetch drivers from both relevant sessions in parallel
    const driverPromises: Promise<import("@/types/api").Driver[]>[] = [];
    if (raceSession) driverPromises.push(getDrivers(raceSession.session_key));
    if (sprintSession && sprintSession.session_key !== raceSession?.session_key)
      driverPromises.push(getDrivers(sprintSession.session_key));
    const driverArrays = await Promise.all(driverPromises);

    const allResults: SessionResult[] = [...raceSr, ...sprintSr];
    const driverMap = new Map<number, DriverInfo>();

    for (const drivers of driverArrays) {
      for (const d of drivers) {
        if (!driverMap.has(d.driver_number)) {
          driverMap.set(d.driver_number, {
            broadcast_name: d.broadcast_name,
            full_name: d.full_name,
            team_name: d.team_name,
            team_colour: d.team_colour,
            country_code: d.country_code,
            name_acronym: d.name_acronym,
          });
        }
      }
    }

    return { results: allResults, drivers: driverMap };
  } catch {
    return null;
  }
}

export default function StandingsView({ meetings, year }: StandingsViewProps) {
  const [resultsByMeeting, setResultsByMeeting] = useState<Record<number, SessionResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<number | "all">("all");
  const [driverLookup, setDriverLookup] = useState<Map<number, DriverInfo>>(new Map());
  const dataCache = useRef<{
    key: string;
    results: Record<number, SessionResult[]>;
    drivers: Map<number, DriverInfo>;
  } | null>(null);

  // Sort meetings chronologically
  const sortedMeetings = useMemo(
    () =>
      [...meetings].sort(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      ),
    [meetings],
  );

  // Load race results + driver info for all meetings (parallel + cached)
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const raceMeetings = sortedMeetings.filter((m) => new Date(m.date_end).getTime() < Date.now());
    const cacheKey = raceMeetings.map((m) => `${m.meeting_key}:${m.date_end}`).join("|");

    // Restore from cache if the meeting set hasn't changed
    if (dataCache.current?.key === cacheKey) {
      setResultsByMeeting(dataCache.current.results);
      setDriverLookup(dataCache.current.drivers);
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      const results: Record<number, SessionResult[]> = {};
      const driverCache = new Map<number, DriverInfo>();

      // Load meetings in parallel batches
      for (let i = 0; i < raceMeetings.length; i += BATCH_SIZE) {
        const batch = raceMeetings.slice(i, i + BATCH_SIZE);
        const entries = await Promise.all(batch.map((m) => loadMeeting(m.meeting_key)));

        for (let j = 0; j < batch.length; j++) {
          const entry = entries[j];
          if (!entry) continue;
          const mk = batch[j].meeting_key;
          results[mk] = entry.results;
          for (const [dn, di] of entry.drivers) {
            if (!driverCache.has(dn)) driverCache.set(dn, di);
          }
        }
      }

      if (mounted) {
        dataCache.current = { key: cacheKey, results, drivers: driverCache };
        setResultsByMeeting(results);
        setDriverLookup(driverCache);
        setLoading(false);
      }
    };

    loadAll();
    return () => {
      mounted = false;
    };
  }, [sortedMeetings]);

  // Calculate standings
  const standings = useMemo(() => {
    const driverPoints = new Map<number, PointsEntry>();

    const meetingsToInclude =
      selectedMeeting === "all"
        ? sortedMeetings
        : sortedMeetings.filter(
            (m) =>
              new Date(m.date_start).getTime() <=
              new Date(
                sortedMeetings.find((sm) => sm.meeting_key === selectedMeeting)?.date_end || "",
              ).getTime(),
          );

    // Only include completed meetings up to selected point
    const completedMks = new Set(
      meetingsToInclude
        .filter((m) => new Date(m.date_end).getTime() < Date.now())
        .map((m) => m.meeting_key),
    );

    for (const [mk, results] of Object.entries(resultsByMeeting)) {
      const meetingKey = Number(mk);
      if (!completedMks.has(meetingKey)) continue;
      if (
        selectedMeeting !== "all" &&
        meetingKey !== selectedMeeting &&
        !meetingsToInclude.some((m) => m.meeting_key === meetingKey)
      )
        continue;

      // Only include the last meeting up to selected
      if (selectedMeeting !== "all" && meetingKey !== selectedMeeting) continue;

      for (const r of results) {
        if (r.position == null) continue;
        const pts = calcPoints(r.position);
        if (pts === 0 && r.points == null) continue;

        const existing = driverPoints.get(r.driver_number);
        if (existing) {
          existing.points += r.points ?? pts;
          if (r.position === 1) existing.wins++;
        } else {
          const di = driverLookup.get(r.driver_number);
          driverPoints.set(r.driver_number, {
            driver_number: r.driver_number,
            broadcast_name: di?.broadcast_name ?? `Driver #${r.driver_number}`,
            full_name: di?.full_name ?? `Driver #${r.driver_number}`,
            team_name: di?.team_name ?? "",
            team_colour: di?.team_colour ?? "",
            country_code: di?.country_code ?? "",
            points: r.points ?? pts,
            wins: r.position === 1 ? 1 : 0,
          });
        }
      }
    }

    // But if selectedMeeting is a specific meeting, calculate points up to and including that meeting
    if (selectedMeeting !== "all") {
      // Recalculate properly
      driverPoints.clear();
      for (const m of sortedMeetings) {
        if (new Date(m.date_end).getTime() >= new Date().getTime()) continue; // skip future
        const results = resultsByMeeting[m.meeting_key];
        if (!results) continue;
        for (const r of results) {
          if (r.position == null) continue;
          const existing = driverPoints.get(r.driver_number);
          const pts = r.points ?? calcPoints(r.position);
          if (existing) {
            existing.points += pts;
            if (r.position === 1) existing.wins++;
          } else {
            const di = driverLookup.get(r.driver_number);
            driverPoints.set(r.driver_number, {
              driver_number: r.driver_number,
              broadcast_name: di?.broadcast_name ?? `Driver #${r.driver_number}`,
              full_name: di?.full_name ?? `Driver #${r.driver_number}`,
              team_name: di?.team_name ?? "",
              team_colour: di?.team_colour ?? "",
              country_code: di?.country_code ?? "",
              points: pts,
              wins: r.position === 1 ? 1 : 0,
            });
          }
        }
        if (m.meeting_key === selectedMeeting) break;
      }
    }

    return [...driverPoints.values()].sort((a, b) => b.points - a.points);
  }, [resultsByMeeting, sortedMeetings, selectedMeeting, driverLookup]);

  if (loading) {
    return <div className="text-center py-10 text-f1-dim text-sm">Loading standings...</div>;
  }

  // Use the actual completed meetings for the selector
  const completedMeetings = sortedMeetings.filter(
    (m) => new Date(m.date_end).getTime() < Date.now(),
  );

  return (
    <div>
      <div className="bg-f1-bg2 border border-f1-border rounded-lg p-4 mb-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-f1-bright">Standings as of:</span>
        <select
          value={selectedMeeting === "all" ? "all" : String(selectedMeeting)}
          onChange={(e) =>
            setSelectedMeeting(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="bg-f1-bg3 border border-f1-border rounded-md px-2.5 py-1.5 text-f1-bright text-xs font-semibold cursor-pointer outline-none focus:border-f1-red font-mono"
        >
          <option value="all">All completed races</option>
          {completedMeetings.map((m) => {
            const date = new Date(m.date_start).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            return (
              <option key={m.meeting_key} value={m.meeting_key}>
                {date} — {m.meeting_name}
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2">
        {standings.map((driver, idx) => (
          <div
            key={driver.driver_number}
            className="bg-f1-bg2 border border-f1-border rounded-lg p-3.5 flex items-center gap-3"
          >
            <div className={`text-xl font-bold w-10 text-center ${posCls(idx)}`}>{idx + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-f1-bright truncate">
                {driver.broadcast_name || driver.full_name}
              </div>
              <div
                className="text-[11px] text-f1-dim truncate"
                style={driver.team_colour ? { color: `#${driver.team_colour}` } : undefined}
              >
                {driver.team_name}
                {driver.wins > 0 && <span className="text-f1-yellow ml-2">🏆 {driver.wins}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-f1-red">{driver.points}</div>
              <div className="text-[10px] text-f1-dim -mt-0.5">PTS</div>
            </div>
          </div>
        ))}
      </div>

      {standings.length === 0 && (
        <div className="text-center py-10 text-f1-dim text-sm">
          <div className="text-4xl mb-3 opacity-40">🏆</div>
          No standings data available. Race results need to be scraped first.
        </div>
      )}
    </div>
  );
}

function posCls(idx: number): string {
  if (idx === 0) return "text-f1-green";
  if (idx === 1 || idx === 2) return "text-f1-blue";
  return "text-f1-dim";
}
