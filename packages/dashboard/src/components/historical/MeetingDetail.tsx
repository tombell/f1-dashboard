import { useState, useEffect, useMemo, useCallback } from "react";
import type React from "react";

import { getSessions, getSessionResults, getStartingGrid, getDrivers } from "@/shared/api/openf1";
import LiveDataSections from "@/shared/components/LiveDataSections";
import { countryFlag, SESSION_TYPE_LABELS } from "@/shared/constants/f1";
import type { Meeting, Session, SessionResult } from "@/shared/types/api";

import SessionResults from "./SessionResults";

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
  sessionKey?: number;
  onSessionSelect?: (session: Session) => void;
}

interface SessionsState {
  meetingKey: number | null;
  sessions: Session[];
}

interface ResultsState {
  meetingKey: number | null;
  sessionKey: number | null;
  results: SessionResult[];
  grid: SessionResult[];
}

type SessionButtonEvent =
  | React.MouseEvent<HTMLButtonElement>
  | React.KeyboardEvent<HTMLButtonElement>;

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

const EMPTY_SESSIONS: Session[] = [];
const EMPTY_RESULTS: SessionResult[] = [];

export default function MeetingDetail({
  meeting,
  onBack,
  sessionKey: initialSessionKey,
  onSessionSelect,
}: MeetingDetailProps) {
  const [sessionData, setSessionData] = useState<SessionsState>({
    meetingKey: null,
    sessions: [],
  });
  const [resultsData, setResultsData] = useState<ResultsState>({
    meetingKey: null,
    sessionKey: null,
    results: [],
    grid: [],
  });
  const sessions =
    sessionData.meetingKey === meeting.meeting_key ? sessionData.sessions : EMPTY_SESSIONS;
  const loading = sessionData.meetingKey !== meeting.meeting_key;

  // Pre-season testing — no historical data available
  const isTesting =
    meeting.meeting_name?.includes("Testing") || meeting.meeting_official_name?.includes("Testing");

  // Sort sessions by date
  const sortedSessions = useMemo(
    () =>
      [...sessions].toSorted(
        (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime(),
      ),
    [sessions],
  );
  const selectedSession = useMemo(() => {
    if (sortedSessions.length === 0) return null;
    if (!initialSessionKey) return sortedSessions[0];
    return sortedSessions.find((s) => s.session_key === initialSessionKey) ?? sortedSessions[0];
  }, [initialSessionKey, sortedSessions]);

  const activeResults =
    selectedSession &&
    resultsData.meetingKey === meeting.meeting_key &&
    resultsData.sessionKey === selectedSession.session_key
      ? resultsData
      : null;
  const results = activeResults?.results ?? EMPTY_RESULTS;
  const grid = activeResults?.grid ?? EMPTY_RESULTS;
  const resultsLoading = Boolean(selectedSession && !activeResults);

  // Load sessions for this meeting
  useEffect(() => {
    let mounted = true;

    getSessions(meeting.meeting_key)
      .then((data) => {
        if (!mounted) return;
        setSessionData({ meetingKey: meeting.meeting_key, sessions: data });
        return null;
      })
      .catch(() => {
        if (!mounted) return;
        setSessionData({ meetingKey: meeting.meeting_key, sessions: [] });
      });

    return () => {
      mounted = false;
    };
  }, [meeting.meeting_key]);

  // Load results when a session is selected
  useEffect(() => {
    if (!selectedSession) return;
    let mounted = true;
    const meetingKey = meeting.meeting_key;
    const sessionKey = selectedSession.session_key;

    const loadResults = async () => {
      try {
        const [sr, sg, drivers] = await Promise.all([
          getSessionResults(meetingKey, sessionKey),
          getStartingGrid(meetingKey, sessionKey),
          getDrivers(sessionKey),
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

        // If driver data is missing team info (e.g. session-scoped data has null team_name/team_colour),
        // fall back to meeting-scoped registry which has the full enriched data
        const hasTeamData = drivers.some((d) => d.team_name != null);
        if (!hasTeamData && selectedSession.meeting_key) {
          try {
            const meetingDrivers = await getDrivers(undefined, selectedSession.meeting_key);
            for (const d of meetingDrivers) {
              const existing = nameMap.get(d.driver_number);
              // Overwrite existing entry if it lacks team data, or add new entries
              if (!existing || !existing.team_name) {
                nameMap.set(d.driver_number, {
                  broadcast_name: d.broadcast_name || existing?.broadcast_name || "",
                  full_name: d.full_name || existing?.full_name || "",
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

        setResultsData({
          meetingKey,
          sessionKey,
          results: enrich(sr),
          grid: enrich(sg),
        });
      } catch {
        if (!mounted) return;
        setResultsData({ meetingKey, sessionKey, results: [], grid: [] });
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
      if (s.session_key === selectedSession?.session_key) return;
      onSessionSelect?.(s);
    },
    [selectedSession, onSessionSelect],
  );

  const handleSessionClickEvent = useCallback(
    (e: SessionButtonEvent) => {
      const key = Number(e.currentTarget.dataset.sessionKey);
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
      <MeetingHeader meeting={meeting} onBack={onBack} />

      {meeting.is_cancelled ? (
        <CancelledMeeting />
      ) : (
        <>
          <SessionSelector
            sessions={sortedSessions}
            selectedSession={selectedSession}
            isTesting={isTesting}
            onSessionAction={handleSessionClickEvent}
          />
          <SessionDetailBody
            loading={loading}
            isTesting={isTesting}
            selectedSession={selectedSession}
            resultsLoading={resultsLoading}
            sessionHasResults={sessionHasResults}
            results={results}
            grid={grid}
            meetingKey={meeting.meeting_key}
          />
        </>
      )}
    </div>
  );
}

function MeetingHeader({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const flag = countryFlag(meeting.country_code);
  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg p-4">
      <button
        type="button"
        onClick={onBack}
        className="text-f1-blue text-xs mb-2 inline-block hover:underline cursor-pointer bg-transparent border-none font-inherit"
      >
        ← Back to meetings
      </button>
      <h2 className="text-lg flex items-center gap-2">
        {flag}{" "}
        <span className={meeting.is_cancelled ? "line-through text-f1-dim" : "text-f1-bright"}>
          {meeting.meeting_name}
        </span>
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
      {meeting.is_cancelled && (
        <div className="mt-3 bg-f1-red/10 border border-f1-red/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-xs font-semibold text-f1-red">CANCELLED</div>
            <div className="text-[11px] text-f1-dim mt-0.5">
              This Grand Prix weekend was cancelled due to severe flooding in the Emilia-Romagna
              region.
            </div>
          </div>
        </div>
      )}
      {!meeting.is_cancelled &&
        meeting.meeting_official_name &&
        meeting.meeting_official_name !== meeting.meeting_name && (
          <div className="mt-2 text-xs text-f1-dim leading-relaxed bg-f1-bg3 rounded-lg p-3">
            {meeting.meeting_official_name}
          </div>
        )}
    </div>
  );
}

function CancelledMeeting() {
  return (
    <div className="bg-f1-bg2 border border-f1-border/40 rounded-lg py-10 text-center">
      <div className="text-5xl mb-3 opacity-40">🌧️</div>
      <div className="text-sm font-semibold text-f1-dim mb-1">Weekend Cancelled</div>
      <div className="text-xs text-f1-dim/60 max-w-md mx-auto px-4">
        The 2023 Emilia Romagna Grand Prix at Imola was called off due to extreme flooding and
        severe weather across the region. No sessions were held.
      </div>
    </div>
  );
}

function SessionSelector({
  sessions,
  selectedSession,
  isTesting,
  onSessionAction,
}: {
  sessions: Session[];
  selectedSession: Session | null;
  isTesting: boolean;
  onSessionAction: (event: SessionButtonEvent) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {sessions.map((s) => {
        const isSelected = selectedSession?.session_key === s.session_key;
        return (
          <button
            key={s.session_key}
            type="button"
            data-session-key={s.session_key}
            onClick={isTesting ? undefined : onSessionAction}
            onKeyDown={isTesting ? undefined : onSessionAction}
            disabled={isTesting}
            aria-label={isTesting ? `${s.session_name} (no data available)` : s.session_name}
            className={`min-w-[150px] shrink-0 text-left bg-f1-bg2 border rounded-lg px-4 py-3 transition-colors font-inherit ${
              isTesting
                ? "border-f1-border opacity-40 cursor-not-allowed"
                : isSelected
                  ? "border-f1-blue bg-f1-bg3 cursor-pointer"
                  : "border-f1-border hover:border-f1-blue hover:bg-f1-bg3 cursor-pointer"
            }`}
          >
            <div className="text-xs font-semibold text-f1-bright whitespace-nowrap">
              {s.session_name}
            </div>
            <div className="mt-1 text-[11px] text-f1-dim whitespace-nowrap">
              {SESSION_TYPE_LABELS[s.session_type] || s.session_type}
            </div>
            <div className="mt-2 text-[11px] text-f1-dim whitespace-nowrap">
              {formatDate(s.date_start)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SessionDetailBody({
  loading,
  isTesting,
  selectedSession,
  resultsLoading,
  sessionHasResults,
  results,
  grid,
  meetingKey,
}: {
  loading: boolean;
  isTesting: boolean;
  selectedSession: Session | null;
  resultsLoading: boolean;
  sessionHasResults: boolean;
  results: SessionResult[];
  grid: SessionResult[];
  meetingKey: number;
}) {
  if (loading) {
    return <div className="text-center py-4 text-f1-dim text-sm">Loading sessions...</div>;
  }

  if (isTesting) {
    return (
      <div className="text-center py-6 text-f1-dim text-sm">
        No live timing data available for pre-season testing sessions.
      </div>
    );
  }

  if (!selectedSession) return null;

  return (
    <>
      {resultsLoading && (
        <div className="bg-f1-bg2 border border-f1-border rounded-lg py-6 text-center text-f1-dim text-sm">
          <span className="inline-block animate-spin mr-2">⟳</span>
          Loading session data...
        </div>
      )}
      {!resultsLoading && sessionHasResults && (
        <SessionResults
          results={results}
          grid={grid}
          sessionType={selectedSession.session_type}
          sessionName={selectedSession.session_name}
        />
      )}

      <LiveDataSections
        sessionKey={selectedSession.session_key}
        meetingKey={meetingKey}
        sessionName={selectedSession.session_name}
      />

      {!sessionHasResults && !resultsLoading && selectedSession.session_type !== "Practice" && (
        <div className="bg-f1-bg2 border border-f1-border rounded-lg py-8 text-center text-f1-dim text-sm">
          <span className="text-4xl mb-3 opacity-40" aria-hidden="true">
            📭
          </span>
          No results available for this session yet.
        </div>
      )}
    </>
  );
}
