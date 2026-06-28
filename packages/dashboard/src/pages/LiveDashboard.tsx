import { useSearchParams } from "react-router-dom";

import BlankSlate from "@/shared/components/BlankSlate";
import DashboardLayout from "@/shared/components/DashboardLayout";
import RaceControl from "@/shared/components/RaceControl";
import TeamRadio from "@/shared/components/TeamRadio";

import PracticeTiming from "../components/live/PracticeTiming";
import TimingTower from "../components/live/TimingTower";
import TrackClock from "../components/live/TrackClock";
import TrackMap from "../components/live/TrackMap";
import WeatherBar from "../components/live/WeatherBar";
import { useLiveDashboardData } from "../hooks/useLiveDashboardData";
import { useLiveSession } from "../hooks/useLiveSession";

export default function LiveDashboard() {
  const [searchParams] = useSearchParams();
  const sessionKey = searchParams.get("session") ? Number(searchParams.get("session")) : undefined;

  const { session, error: sessionError } = useLiveSession(sessionKey);
  const data = useLiveDashboardData(session);

  const displayError = session ? data.error : null;
  const blankSlateTitle = sessionKey ? "Session not available" : "No active session";
  const blankSlateMessage =
    sessionError ?? "Live timing will appear here when a session is active.";

  return (
    <DashboardLayout session={session} currentLap={data.currentLap} activeView="live">
      {session && (
        <div className="flex items-center gap-3 flex-wrap">
          <WeatherBar weather={data.latestWeather} />
          <TrackClock />
        </div>
      )}
      {displayError && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {displayError}
        </div>
      )}
      {!session ? (
        <BlankSlate title={blankSlateTitle} icon="🏎️">
          {blankSlateMessage}
        </BlankSlate>
      ) : (
        <div className="grid grid-cols-[1fr_2fr] gap-3 items-start max-lg:grid-cols-1">
          <TimingTower
            session={session}
            drivers={data.drivers}
            positions={data.latestPositions}
            intervals={data.intervals}
            positionChanges={data.positionChanges}
            recentPits={data.recentPits}
            fastestLapDriver={data.fastestLapDriver}
            currentTyres={data.currentTyres}
            retiredDrivers={data.retiredDrivers}
            driverPenalties={data.driverPenalties}
            driverLaps={data.driverLaps}
          />
          <div className="flex flex-col gap-3 min-w-0">
            <TrackMap session={session} drivers={data.drivers} />
            {(session.session_type === "Practice" || session.session_type === "Qualifying") && (
              <PracticeTiming sessionKey={session.session_key} sessionType={session.session_type} />
            )}
            <RaceControl sessionKey={session.session_key} />
            <TeamRadio sessionKey={session.session_key} drivers={data.driverNameMap} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
