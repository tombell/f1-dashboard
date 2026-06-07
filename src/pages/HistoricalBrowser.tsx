import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { getMeetings, getLatestSession } from "@/api/openf1";
import Header from "@/components/Header";
import MeetingCalendar from "@/components/MeetingCalendar";
import MeetingDetail from "@/components/MeetingDetail";
import StandingsView from "@/components/StandingsView";
import type { Meeting, Session } from "@/types/api";

type ViewTab = "races" | "standings";

export default function HistoricalBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const view = (searchParams.get("view") as ViewTab) || "races";

  // Load meetings
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMeetings(year)
      .then((data) => {
        if (!mounted) return;
        setMeetings(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load meetings");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [year]);

  // Check for deep-link meeting/session
  const meetingKey = searchParams.get("meeting");
  const sessionKey = searchParams.get("session");

  useEffect(() => {
    if (meetingKey && meetings.length > 0) {
      const mk = Number(meetingKey);
      const m = meetings.find((m) => m.meeting_key === mk);
      if (m) setSelectedMeeting(m);
    }
  }, [meetingKey, meetings]);

  useCallback(() => {
    getLatestSession().then((s) => {
      if (s) setSession(s);
    });
  }, []);

  const handleSelectMeeting = useCallback(
    (meeting: Meeting) => {
      setSelectedMeeting(meeting);
      const params = new URLSearchParams(searchParams);
      params.set("meeting", String(meeting.meeting_key));
      params.delete("session");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleBack = useCallback(() => {
    setSelectedMeeting(null);
    const params = new URLSearchParams(searchParams);
    params.delete("meeting");
    params.delete("session");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSelectSession = useCallback(
    (session: Session) => {
      const params = new URLSearchParams(searchParams);
      params.set("session", String(session.session_key));
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleYearChange = useCallback(
    (y: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("year", String(y));
      params.delete("meeting");
      params.delete("session");
      setSelectedMeeting(null);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleViewChange = useCallback(
    (v: ViewTab) => {
      const params = new URLSearchParams(searchParams);
      if (v === "races") {
        params.delete("view");
      } else {
        params.set("view", v);
      }
      params.delete("meeting");
      params.delete("session");
      setSelectedMeeting(null);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2017 }, (_, i) => 2018 + i).toReversed();

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-screen">
      <Header session={session} onRefresh={() => {}} />

      <div className="bg-f1-bg2 border border-f1-border rounded-lg px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleViewChange("races")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent ${
              view === "races"
                ? "bg-f1-red text-white border-white/20"
                : "bg-f1-bg3 text-f1-text hover:bg-f1-bg4"
            }`}
          >
            Races
          </button>
          <button
            onClick={() => handleViewChange("standings")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors border border-transparent ${
              view === "standings"
                ? "bg-f1-red text-white border-white/20"
                : "bg-f1-bg3 text-f1-text hover:bg-f1-bg4"
            }`}
          >
            Standings
          </button>
        </div>

        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="bg-f1-bg3 border border-f1-border rounded-md px-2.5 py-1.5 text-f1-bright text-xs font-semibold cursor-pointer outline-none focus:border-f1-red transition-colors font-mono"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {error}
        </div>
      )}

      {loading && <div className="text-center py-8 text-f1-dim text-sm">Loading...</div>}

      {!loading && view === "races" && (
        <>
          {selectedMeeting ? (
            <MeetingDetail
              meeting={selectedMeeting}
              onBack={handleBack}
              sessionKey={sessionKey ? Number(sessionKey) : undefined}
              onSessionSelect={handleSelectSession}
            />
          ) : (
            <MeetingCalendar meetings={meetings} onSelect={handleSelectMeeting} />
          )}
        </>
      )}

      {!loading && view === "standings" && <StandingsView meetings={meetings} year={year} />}
    </div>
  );
}
