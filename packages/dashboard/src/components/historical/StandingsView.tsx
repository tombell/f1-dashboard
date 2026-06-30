import { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { getSessionResults, getSessions, getDrivers } from "@/shared/api/openf1";
import type { Meeting, SessionResult } from "@/shared/types/api";

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
  raceWins: number;
  sprintWins: number;
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

function calcPoints(position: number | null): number {
  if (position == null) return 0;
  return POINTS_SYSTEM[position - 1] || 0;
}

type ResultKind = "race" | "sprint";

type StandingResult = SessionResult & {
  resultKind: ResultKind;
};

type LoadResult = {
  results: StandingResult[];
  drivers: Map<number, DriverInfo>;
} | null;

interface StandingsDataState {
  cacheKey: string | null;
  results: Record<number, StandingResult[]>;
  drivers: Map<number, DriverInfo>;
}

const EMPTY_RESULTS_BY_MEETING: Record<number, StandingResult[]> = {};
const EMPTY_DRIVER_LOOKUP = new Map<number, DriverInfo>();

async function loadMeeting(mk: number): Promise<LoadResult> {
  try {
    const sessions = await getSessions(mk);
    const raceSession = sessions.find(
      (s) => s.session_type === "Race" && s.session_name !== "Sprint",
    );
    const sprintSession = sessions.find((s) => s.session_name === "Sprint");

    // Fetch race + sprint results in parallel
    const [raceSr, sprintSr] = await Promise.all([
      raceSession
        ? getSessionResults(mk, raceSession.session_key)
        : Promise.resolve([] as SessionResult[]),
      sprintSession && sprintSession.session_key !== raceSession?.session_key
        ? getSessionResults(mk, sprintSession.session_key)
        : Promise.resolve([] as SessionResult[]),
    ]);

    // Fetch drivers from both relevant sessions in parallel
    const driverPromises: Promise<import("@/shared/types/api").Driver[]>[] = [];
    if (raceSession) driverPromises.push(getDrivers(raceSession.session_key));
    if (sprintSession && sprintSession.session_key !== raceSession?.session_key)
      driverPromises.push(getDrivers(sprintSession.session_key));
    const driverArrays = await Promise.all(driverPromises);

    const allResults: StandingResult[] = [];
    for (const result of raceSr) {
      allResults.push(Object.assign({}, result, { resultKind: "race" as const }));
    }
    for (const result of sprintSr) {
      allResults.push(Object.assign({}, result, { resultKind: "sprint" as const }));
    }
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

function addStandingResult(
  driverPoints: Map<number, PointsEntry>,
  result: StandingResult,
  driverLookup: Map<number, DriverInfo>,
  includeZeroPointEntries: boolean,
) {
  if (result.position == null) return;

  const points = result.points ?? calcPoints(result.position);
  if (!includeZeroPointEntries && points === 0 && result.points == null) return;

  const existing = driverPoints.get(result.driver_number);
  if (existing) {
    existing.points += points;
    if (result.position === 1) {
      if (result.resultKind === "sprint") existing.sprintWins++;
      else existing.raceWins++;
    }
    return;
  }

  const driver = driverLookup.get(result.driver_number);
  driverPoints.set(result.driver_number, {
    driver_number: result.driver_number,
    broadcast_name: driver?.broadcast_name ?? `Driver #${result.driver_number}`,
    full_name: driver?.full_name ?? `Driver #${result.driver_number}`,
    team_name: driver?.team_name ?? "",
    team_colour: driver?.team_colour ?? "",
    country_code: driver?.country_code ?? "",
    points,
    raceWins: result.position === 1 && result.resultKind === "race" ? 1 : 0,
    sprintWins: result.position === 1 && result.resultKind === "sprint" ? 1 : 0,
  });
}

export default function StandingsView({ meetings, year: _year }: StandingsViewProps) {
  const [dataState, setDataState] = useState<StandingsDataState>(() => ({
    cacheKey: null,
    results: EMPTY_RESULTS_BY_MEETING,
    drivers: EMPTY_DRIVER_LOOKUP,
  }));
  const [selectedMeeting, setSelectedMeeting] = useState<number | "all">("all");
  const dataCache = useRef<StandingsDataState | null>(null);

  const handleMeetingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMeeting(e.target.value === "all" ? "all" : Number(e.target.value));
  }, []);

  // Sort meetings chronologically
  const sortedMeetings = useMemo(
    () =>
      [...meetings].toSorted(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      ),
    [meetings],
  );
  const raceMeetings = useMemo(
    () => sortedMeetings.filter((m) => new Date(m.date_end).getTime() < Date.now()),
    [sortedMeetings],
  );
  const cacheKey = useMemo(
    () => raceMeetings.map((m) => `${m.meeting_key}:${m.date_end}`).join("|"),
    [raceMeetings],
  );
  const cachedData = dataCache.current?.cacheKey === cacheKey ? dataCache.current : null;
  const activeData = dataState.cacheKey === cacheKey ? dataState : cachedData;
  const loading = !activeData;
  const resultsByMeeting = activeData?.results ?? EMPTY_RESULTS_BY_MEETING;
  const driverLookup = activeData?.drivers ?? EMPTY_DRIVER_LOOKUP;
  const effectiveSelectedMeeting =
    selectedMeeting === "all" || raceMeetings.some((m) => m.meeting_key === selectedMeeting)
      ? selectedMeeting
      : "all";

  // Load race results + driver info for all meetings (parallel + cached)
  useEffect(() => {
    let mounted = true;

    // Restore from cache if the meeting set hasn't changed
    if (dataCache.current?.cacheKey === cacheKey) {
      return;
    }

    const loadAll = async () => {
      const results: Record<number, StandingResult[]> = {};
      const driverCache = new Map<number, DriverInfo>();

      const entries = await Promise.all(raceMeetings.map((m) => loadMeeting(m.meeting_key)));

      for (let i = 0; i < raceMeetings.length; i++) {
        const entry = entries[i];
        if (!entry) continue;
        const mk = raceMeetings[i].meeting_key;
        results[mk] = entry.results;
        for (const [dn, di] of entry.drivers) {
          if (!driverCache.has(dn)) driverCache.set(dn, di);
        }
      }

      // Fallback: if per-session driver data is sparse, fetch all drivers from the API
      // (F1 driver numbers are career-long, so numbers are stable across seasons)
      if (raceMeetings.length > 0 && driverCache.size < 10) {
        try {
          const allDrivers = await getDrivers();
          for (const d of allDrivers) {
            if (!driverCache.has(d.driver_number)) {
              driverCache.set(d.driver_number, {
                broadcast_name: d.broadcast_name,
                full_name: d.full_name,
                team_name: d.team_name,
                team_colour: d.team_colour,
                country_code: d.country_code,
                name_acronym: d.name_acronym,
              });
            }
          }
        } catch {
          // fallback failed, driver names may show as "Driver #N"
        }
      }

      if (mounted) {
        const nextState = { cacheKey, results, drivers: driverCache };
        dataCache.current = nextState;
        setDataState(nextState);
      }
    };

    loadAll();
    return () => {
      mounted = false;
    };
  }, [cacheKey, raceMeetings]);

  // Calculate standings
  const standings = useMemo(() => {
    const driverPoints = new Map<number, PointsEntry>();
    const now = Date.now();
    const includeZeroPointEntries = effectiveSelectedMeeting !== "all";

    for (const meeting of sortedMeetings) {
      if (new Date(meeting.date_end).getTime() >= now) continue;

      const results = resultsByMeeting[meeting.meeting_key];
      if (results) {
        for (const result of results) {
          addStandingResult(driverPoints, result, driverLookup, includeZeroPointEntries);
        }
      }

      if (meeting.meeting_key === effectiveSelectedMeeting) break;
    }

    return [...driverPoints.values()].toSorted((a, b) => b.points - a.points);
  }, [resultsByMeeting, sortedMeetings, effectiveSelectedMeeting, driverLookup]);

  if (loading) {
    return <div className="text-center py-10 text-f1-dim text-sm">Loading standings...</div>;
  }

  // Use the actual completed meetings for the selector
  const completedMeetings = raceMeetings;

  return (
    <div>
      <div className="bg-f1-bg2 border border-f1-border rounded-lg p-4 mb-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-f1-bright">Standings as of:</span>
        <select
          value={effectiveSelectedMeeting === "all" ? "all" : String(effectiveSelectedMeeting)}
          onChange={handleMeetingChange}
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
                style={driverStyle(driver.team_colour)}
              >
                {driver.team_name}
                {driver.raceWins > 0 && (
                  <span className="text-f1-yellow ml-2">🏆 Race {driver.raceWins}</span>
                )}
                {driver.sprintWins > 0 && (
                  <span className="text-f1-yellow ml-2">
                    {driver.raceWins > 0 ? "· " : ""}Sprint {driver.sprintWins}
                  </span>
                )}
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
  if (idx === 0) return "text-f1-gold";
  if (idx === 1) return "text-f1-silver";
  if (idx === 2) return "text-f1-bronze";
  return "text-f1-dim";
}

function driverStyle(colour: string): React.CSSProperties | undefined {
  return colour ? { color: `#${colour}` } : undefined;
}
