import { useState, useEffect, useCallback, useMemo } from "react";
import type React from "react";
import { useSearchParams } from "react-router-dom";

import { getMeetings } from "@/shared/api/openf1";
import BlankSlate from "@/shared/components/BlankSlate";
import DashboardLayout from "@/shared/components/DashboardLayout";
import Panel from "@/shared/components/Panel";
import SegmentedNav from "@/shared/components/SegmentedNav";
import type { Meeting, Session } from "@/shared/types/api";

import MeetingCalendar from "../components/historical/MeetingCalendar";
import MeetingDetail from "../components/historical/MeetingDetail";
import StandingsView from "../components/historical/StandingsView";

type ViewTab = "races" | "standings";

const EMPTY_MEETINGS: Meeting[] = [];

interface MeetingsState {
  year: number | null;
  meetings: Meeting[];
  error: string | null;
}

export default function HistoricalBrowser() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meetingsState, setMeetingsState] = useState<MeetingsState>({
    year: null,
    meetings: [],
    error: null,
  });

  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const view = (searchParams.get("view") as ViewTab) || "races";
  const meetingKey = searchParams.get("meeting");
  const sessionKey = searchParams.get("session");
  const loading = meetingsState.year !== year;
  const meetings = loading ? EMPTY_MEETINGS : meetingsState.meetings;
  const error = loading ? null : meetingsState.error;
  const selectedMeeting = useMemo(() => {
    if (!meetingKey) return null;
    const key = Number(meetingKey);
    return meetings.find((m) => m.meeting_key === key) ?? null;
  }, [meetingKey, meetings]);

  // Load meetings
  useEffect(() => {
    let mounted = true;
    getMeetings(year)
      .then((data) => {
        if (!mounted) return;
        setMeetingsState({ year, meetings: data, error: null });
        return null;
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setMeetingsState({
          year,
          meetings: [],
          error: e instanceof Error ? e.message : "Failed to load meetings",
        });
      });
    return () => {
      mounted = false;
    };
  }, [year]);

  const handleSelectMeeting = useCallback(
    (meeting: Meeting) => {
      const params = new URLSearchParams(searchParams);
      params.set("meeting", String(meeting.meeting_key));
      params.delete("session");
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("meeting");
    params.delete("session");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSelectSession = useCallback(
    (selSession: Session) => {
      const params = new URLSearchParams(searchParams);
      params.set("session", String(selSession.session_key));
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
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleRacesClick = useCallback(() => handleViewChange("races"), [handleViewChange]);
  const handleStandingsClick = useCallback(() => handleViewChange("standings"), [handleViewChange]);
  const handleYearSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => handleYearChange(Number(e.target.value)),
    [handleYearChange],
  );
  const viewItems = useMemo(
    () => [
      { value: "races" as const, label: "Races", onClick: handleRacesClick },
      { value: "standings" as const, label: "Standings", onClick: handleStandingsClick },
    ],
    [handleRacesClick, handleStandingsClick],
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i).toReversed();

  return (
    <DashboardLayout session={null} activeView="historical">
      <Panel bodyClassName="px-3 py-2">
        <div className="flex items-center flex-wrap gap-2.5">
          <select
            value={year}
            onChange={handleYearSelect}
            className="bg-f1-bg3 border border-f1-border rounded-md px-2.5 py-1.5 text-f1-bright text-xs font-semibold cursor-pointer outline-none focus:border-f1-red transition-colors font-mono"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <SegmentedNav ariaLabel="Historical views" active={view} items={viewItems} />
        </div>
      </Panel>

      {loading && <div className="text-center py-8 text-f1-dim text-sm">Loading...</div>}

      {!loading && error && (
        <BlankSlate title="Historical data unavailable" icon="📚">
          {error}
        </BlankSlate>
      )}

      {!loading && !error && meetings.length === 0 && (
        <BlankSlate title={`No ${year} data yet`} icon="📅">
          Historical races and standings will appear here once OpenF1 has data for this season.
        </BlankSlate>
      )}

      {!loading && !error && meetings.length > 0 && view === "races" && (
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

      {!loading && !error && meetings.length > 0 && view === "standings" && (
        <StandingsView meetings={meetings} year={year} />
      )}
    </DashboardLayout>
  );
}
