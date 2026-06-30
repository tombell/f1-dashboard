import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import {
  getDrivers,
  getLaps,
  getPitStops,
  getPositions,
  getStints,
  getWeather,
} from "@/shared/api/openf1";
import type { Driver, Lap, PitStop, Position, Stint, WeatherReading } from "@/shared/types/api";

import LapTimesTable from "./LapTimesTable";
import LiveSection from "./LiveSection";
import PitStopsTable from "./PitStopsTable";
import PositionChangesTable from "./PositionChangesTable";
import RaceControl from "./RaceControl";
import TeamRadio from "./TeamRadio";
import TyreStints from "./TyreStints";
import WeatherChart from "./WeatherChart";

interface LiveDataSectionsProps {
  sessionKey: number;
  meetingKey: number;
  sessionName?: string;
}

interface DriverDisplayInfo {
  broadcast_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
}

interface LiveDataState {
  sessionKey: number | null;
  laps: Lap[];
  pits: PitStop[];
  stints: Stint[];
  weather: WeatherReading[];
  positions: Position[];
  driverMap: Map<number, DriverDisplayInfo>;
}

type DriverFallbackCache = Map<number, Map<number, DriverDisplayInfo>>;

const EMPTY_DRIVER_MAP = new Map<number, DriverDisplayInfo>();
const EMPTY_LIVE_DATA: LiveDataState = {
  sessionKey: null,
  laps: [],
  pits: [],
  stints: [],
  weather: [],
  positions: [],
  driverMap: EMPTY_DRIVER_MAP,
};

export default function LiveDataSections({
  sessionKey,
  meetingKey,
  sessionName,
}: LiveDataSectionsProps) {
  const [liveData, setLiveData] = useState<LiveDataState>(() => EMPTY_LIVE_DATA);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const driverFallbackCache = useRef<DriverFallbackCache | null>(null);
  if (driverFallbackCache.current === null) {
    driverFallbackCache.current = new Map();
  }
  const currentLiveData = liveData.sessionKey === sessionKey ? liveData : EMPTY_LIVE_DATA;
  const { laps, pits, stints, weather, positions, driverMap } = currentLiveData;

  const handleToggle = useCallback((k: string) => {
    setCollapsed((c) => ({ ...c, [k]: !c[k] }));
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    let mounted = true;

    const fetchLiveData = async () => {
      try {
        const [l, p, s, w, pos, drs] = await Promise.all([
          getLaps(sessionKey).catch(() => []),
          getPitStops(sessionKey).catch(() => []),
          getStints(sessionKey).catch(() => []),
          getWeather(sessionKey).catch(() => []),
          getPositions(sessionKey).catch(() => []),
          getDrivers(sessionKey).catch(() => [] as Driver[]),
        ]);
        if (!mounted) return;
        // Build driver name map
        const nameMap = new Map<number, DriverDisplayInfo>();
        for (const d of drs) {
          if (!nameMap.has(d.driver_number)) {
            nameMap.set(d.driver_number, {
              broadcast_name: d.broadcast_name ?? d.full_name ?? d.name_acronym,
              name_acronym: d.name_acronym,
              team_name: d.team_name,
              team_colour: d.team_colour,
            });
          }
        }

        // Fallback if per-session drivers are sparse or lack team data — scope to the meeting.
        // Some FP1 driver lists include names but omit teams/colours, while later sessions have them.
        const hasMissingTeamData = [...nameMap.values()].some(
          (info) => !info.team_name || !info.team_colour,
        );
        if ((nameMap.size < 10 || hasMissingTeamData) && meetingKey) {
          const fallbackCache = driverFallbackCache.current;
          let meetingCache = fallbackCache?.get(meetingKey);
          if (!meetingCache) {
            try {
              const meetingDrivers = await getDrivers(undefined, meetingKey);
              meetingCache = new Map();
              for (const d of meetingDrivers) {
                const existing = meetingCache.get(d.driver_number);
                if (!existing || (!existing.team_name && d.team_name)) {
                  meetingCache.set(d.driver_number, {
                    broadcast_name: d.broadcast_name ?? d.full_name ?? d.name_acronym,
                    name_acronym: d.name_acronym,
                    team_name: d.team_name,
                    team_colour: d.team_colour,
                  });
                }
              }
              fallbackCache?.set(meetingKey, meetingCache);
            } catch {
              // fallback failed
            }
          }
          if (meetingCache) {
            for (const [dn, info] of meetingCache) {
              const existing = nameMap.get(dn);
              if (!existing || !existing.team_name || !existing.team_colour) {
                nameMap.set(dn, {
                  broadcast_name: existing?.broadcast_name || info.broadcast_name,
                  name_acronym: existing?.name_acronym || info.name_acronym,
                  team_name: existing?.team_name || info.team_name,
                  team_colour: existing?.team_colour || info.team_colour,
                });
              }
            }
          }
        }

        setLiveData({
          sessionKey,
          laps: l,
          pits: p,
          stints: s,
          weather: w,
          positions: pos,
          driverMap: nameMap,
        });
      } catch {
        // silent
      }
    };

    fetchLiveData();
    return () => {
      mounted = false;
    };
  }, [sessionKey, meetingKey]);

  const driverAcronymMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const [driverNumber, driver] of driverMap) {
      map.set(driverNumber, driver.name_acronym);
    }
    return map;
  }, [driverMap]);
  const dataAvailable =
    laps.length > 0 || pits.length > 0 || stints.length > 0 || weather.length > 0;
  if (!dataAvailable) return null;

  const hasWeather = weather.length > 0;
  const isRace = sessionName === "Race";
  const showsPositionChanges = sessionName === "Race" || sessionName === "Sprint";

  return (
    <div className="flex flex-col gap-3 mt-3">
      <LapTimesTable
        laps={laps}
        driverMap={driverMap}
        collapsed={collapsed}
        onToggle={handleToggle}
      />
      <PitStopsTable
        pits={pits}
        driverMap={driverMap}
        collapsed={collapsed}
        onToggle={handleToggle}
      />
      <TyreStints
        stints={stints}
        laps={laps}
        driverMap={driverMap}
        collapsed={collapsed}
        onToggle={handleToggle}
        isRace={isRace}
      />
      {showsPositionChanges && (
        <PositionChangesTable
          positions={positions}
          driverMap={driverMap}
          collapsed={collapsed}
          onToggle={handleToggle}
        />
      )}

      <div className={hasWeather ? "grid gap-3 lg:grid-cols-4 lg:h-[400px] lg:min-h-0" : ""}>
        {hasWeather && (
          <div className="min-w-0 lg:col-span-3 lg:h-full lg:min-h-0">
            <LiveSection
              title="🌤️ Weather History"
              sectionKey="weather"
              collapsed={collapsed}
              onToggle={handleToggle}
              collapsible={false}
              className="h-full"
            >
              <WeatherChart data={weather} />
            </LiveSection>
          </div>
        )}
        <div className="min-w-0 lg:col-span-1 lg:h-full lg:min-h-0">
          <TeamRadio sessionKey={sessionKey} drivers={driverAcronymMap} />
        </div>
      </div>

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
