import { useState, useEffect, useMemo } from "react";
import type React from "react";

import { getSessions, getSessionResults, getStartingGrid, getDrivers } from "@/api/openf1";
import LiveDataSections from "@/components/LiveDataSections";
import SessionResults from "@/components/SessionResults";
import type { Meeting, Session, SessionResult } from "@/types/api";

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
  sessionKey?: number;
  onSessionSelect?: (session: Session) => void;
}

function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏁";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    countryCode.charCodeAt(0) + offset,
    countryCode.charCodeAt(1) + offset,
  );
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  Practice: "Practice",
  Qualifying: "Qualifying",
  Race: "Race",
  Sprint: "Sprint",
  SprintQualifying: "Sprint Qualifying",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default function MeetingDetail({
  meeting,
  onBack,
  sessionKey: initialSessionKey,
  onSessionSelect,
}: MeetingDetailProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [grid, setGrid] = useState<SessionResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Sort sessions by date
  const sortedSessions = useMemo(
    () =>
      [...sessions].toSorted(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      ),
    [sessions],
  );

  const flag = countryFlag(meeting.country_code);

  // Load sessions for this meeting
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getSessions(meeting.meeting_key)
      .then((data) => {
        if (!mounted) return;
        setSessions(data);

        // Auto-select first session that matches initialSessionKey or has results
        if (initialSessionKey) {
          const found = data.find((s) => s.session_key === initialSessionKey);
          if (found) {
            setSelectedSession(found);
            setLoading(false);
            return;
          }
        }
        // Default to first session
        if (data.length > 0) {
          setSelectedSession(data[0]);
        }
        setLoading(false);
        return null;
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [meeting.meeting_key, initialSessionKey]);

  // Load results when a session is selected
  useEffect(() => {
    if (!selectedSession) return;
    let mounted = true;

    const loadResults = async () => {
      try {
        const [sr, sg, drivers] = await Promise.all([
          getSessionResults(meeting.meeting_key, selectedSession.session_key),
          getStartingGrid(meeting.meeting_key, selectedSession.session_key),
          getDrivers(selectedSession.session_key),
        ]);
        if (!mounted) return;

        // Build driver name/team lookup
        const nameMap = new Map<
          number,
          { broadcast_name: string; full_name: string; team_name: string; team_colour: string }
        >();
        for (const d of drivers) {
          nameMap.set(d.driver_number, {
            broadcast_name: d.broadcast_name,
            full_name: d.full_name,
            team_name: d.team_name,
            team_colour: d.team_colour,
          });
        }

        // If driver data is empty for this session, fall back to all-driver registry
        if (nameMap.size < 10) {
          try {
            const allDrivers = await getDrivers();
            for (const d of allDrivers) {
              if (!nameMap.has(d.driver_number)) {
                nameMap.set(d.driver_number, {
                  broadcast_name: d.broadcast_name,
                  full_name: d.full_name,
                  team_name: d.team_name,
                  team_colour: d.team_colour,
                });
              }
            }
          } catch {
            // fallback failed
          }
        }

        // Enrich results with driver names and teams
        const enrich = (arr: SessionResult[]) =>
          arr.map((r) => {
            const info = nameMap.get(r.driver_number);
            if (info) {
              return {
                ...r,
                broadcast_name: r.broadcast_name || info.broadcast_name,
                full_name: r.full_name || info.full_name,
                team_name: r.team_name || info.team_name,
                team_colour: r.team_colour || info.team_colour,
              };
            }
            return r;
          });

        setResults(enrich(sr));
        setGrid(enrich(sg));
      } catch {
        if (!mounted) return;
        setResults([]);
        setGrid([]);
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [selectedSession, meeting.meeting_key]);

  const sessionHasResults = results.length > 0;

  const handleSessionClick = useCallback(
    (s: Session) => {
      setSelectedSession(s);
      onSessionSelect?.(s);
    },
    [setSelectedSession, onSessionSelect],
  );

  const handleSessionClickEvent = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      const key = Number((e.currentTarget as HTMLElement).dataset.sessionKey);
      const s = sortedSessions.find((ss) => ss.session_key === key);
      if (s) {
        if ("key" in e) {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
        }
        handleSessionClick(s);
      }
    },
    [sortedSessions, handleSessionClick],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Meeting header */}
      <div className="bg-f1-bg2 border border-f1-border rounded-lg p-4">
        <button
          onClick={onBack}
          className="text-f1-blue text-xs mb-2 inline-block hover:underline cursor-pointer bg-transparent border-none font-inherit"
        >
          ← Back to meetings
        </button>
        <h2 className="text-lg text-f1-bright flex items-center gap-2">
          {flag} {meeting.meeting_name}
        </h2>
        <div className="text-xs text-f1-dim mt-1 flex gap-4 flex-wrap">
          <span>📍 {meeting.circuit_short_name}</span>
          <span>
            📍 {meeting.location}, {meeting.country_name}
          </span>
          <span>
            📅{" "}
            {new Date(meeting.date_start).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </div>
        {meeting.meeting_official_name &&
          meeting.meeting_official_name !== meeting.meeting_name && (
            <div className="mt-2 text-xs text-f1-dim leading-relaxed bg-f1-bg3 rounded-lg p-3">
              {meeting.meeting_official_name}
            </div>
          )}
      </div>

      {/* Session selector */}
      <div className="flex flex-col gap-1.5">
        {sortedSessions.map((s) => {
          const isSelected = selectedSession?.session_key === s.session_key;
          return (
            <button
              key={s.session_key}
              type="button"
              data-session-key={s.session_key}
              onClick={handleSessionClickEvent}
              onKeyDown={handleSessionClickEvent}
              aria-label={s.session_name}
              className={`w-full text-left bg-f1-bg2 border rounded-lg px-4 py-3 flex justify-between items-center cursor-pointer transition-colors font-inherit ${
                isSelected
                  ? "border-f1-blue bg-f1-bg3"
                  : "border-f1-border hover:border-f1-blue hover:bg-f1-bg3"
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-f1-bright">{s.session_name}</div>
                <div className="text-[11px] text-f1-dim">
                  {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-f1-dim">{formatDate(s.date_start)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading && <div className="text-center py-4 text-f1-dim text-sm">Loading sessions...</div>}

      {!loading && selectedSession && (
        <>
          {sessionHasResults && (
            <SessionResults
              results={results}
              grid={grid}
              sessionType={selectedSession.session_type}
              sessionName={selectedSession.session_name}
            />
          )}

          <LiveDataSections
            sessionKey={selectedSession.session_key}
            meetingKey={meeting.meeting_key}
            sessionName={selectedSession.session_name}
          />
        </>
      )}

      {!loading && selectedSession && !sessionHasResults && (
        <div className="bg-f1-bg2 border border-f1-border rounded-lg py-8 text-center text-f1-dim text-sm">
          <span className="text-4xl mb-3 opacity-40" aria-hidden="true">
            📭
          </span>
          No results available for this session yet.
        </div>
      )}
    </div>
  );
}
