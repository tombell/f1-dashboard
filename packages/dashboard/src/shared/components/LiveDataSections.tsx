import { useState, useEffect, useRef, useCallback } from "react";

import {
  getLaps,
  getPitStops,
  getStints,
  getWeather,
  getRaceControl,
  getPositions,
  getDrivers,
} from "@/shared/api/openf1";
import type {
  Lap,
  PitStop,
  Stint,
  WeatherReading,
  RaceControlMessage,
  Position,
  Driver,
} from "@/shared/types/api";

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

        // Fallback if per-session drivers are sparse or lack team data — scope to the meeting.
        // Some FP1 driver lists include names but omit teams/colours, while later sessions have them.
        const hasMissingTeamData = [...nameMap.values()].some(
          (info) => !info.team_name || !info.team_colour,
        );
        if ((nameMap.size < 10 || hasMissingTeamData) && meetingKey) {
          let meetingCache = driverFallbackCache.current.get(meetingKey);
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
              driverFallbackCache.current.set(meetingKey, meetingCache);
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
  const showsPositionChanges = sessionName === "Race" || sessionName === "Sprint";
  const driverAcronymMap = new Map([...driverMap.entries()].map(([n, d]) => [n, d.name_acronym]));

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
