import {
  getLaps,
  getPitStops,
  getStints,
  getWeather,
  getRaceControl,
  getPositions,
  getDrivers,
} from "@f1-dashboard/shared/api/openf1";
import type {
  Lap,
  PitStop,
  Stint,
  WeatherReading,
  RaceControlMessage,
  Position,
  Driver,
} from "@f1-dashboard/shared/types/api";
import { useState, useEffect, useRef, useCallback } from "react";

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

export default function LiveDataSections({
  sessionKey,
  meetingKey,
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
    Map<
      number,
      { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
    >
  >(new Map());
  const driverFallbackCache = useRef<
    Map<
      number,
      Map<
        number,
        { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
      >
    >
  >(new Map());

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
          { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
        >();
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

        // Fallback if per-session drivers are sparse — scope to the meeting
        if (nameMap.size < 10 && meetingKey) {
          let meetingCache = driverFallbackCache.current.get(meetingKey);
          if (!meetingCache) {
            try {
              const meetingDrivers = await getDrivers(undefined, meetingKey);
              meetingCache = new Map();
              for (const d of meetingDrivers) {
                if (!meetingCache.has(d.driver_number)) {
                  meetingCache.set(d.driver_number, {
                    broadcast_name: d.broadcast_name ?? d.full_name ?? d.name_acronym,
                    name_acronym: d.name_acronym,
                    team_name: d.team_name,
                    team_colour: d.team_colour,
                  });
                }
              }
              driverFallbackCache.current.set(meetingKey, meetingCache);
            } catch {
              // fallback failed
            }
          }
          if (meetingCache) {
            for (const [dn, info] of meetingCache) {
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
  }, [sessionKey, meetingKey]);

  const dataAvailable =
    laps.length > 0 || pits.length > 0 || stints.length > 0 || weather.length > 0;
  if (!dataAvailable) return null;

  const hasWeather = weather.length > 0;
  const isRace = sessionName === "Race";

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="text-xs text-f1-dim font-semibold uppercase tracking-wider">📊 Live Data</div>

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
      {!sessionName?.startsWith("Practice") && (
        <PositionChangesTable
          positions={positions}
          driverMap={driverMap}
          collapsed={collapsed}
          onToggle={handleToggle}
        />
      )}

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

      <LiveSection
        title="🚩 Race Control"
        sectionKey="rc"
        collapsed={collapsed}
        onToggle={handleToggle}
      >
        <RaceControl sessionKey={sessionKey} />
      </LiveSection>

      <LiveSection
        title="📻 Team Radio"
        sectionKey="radio"
        collapsed={collapsed}
        onToggle={handleToggle}
      >
        <TeamRadio
          sessionKey={sessionKey}
          drivers={
            new Map([...driverMap.entries()].map(([n, d]) => [n, d.name_acronym])) as Map<
              number,
              string
            >
          }
        />
      </LiveSection>
    </div>
  );
}
