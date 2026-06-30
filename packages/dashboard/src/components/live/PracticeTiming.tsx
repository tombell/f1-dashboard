import { useEffect, useState, useMemo } from "react";

import { getLaps, getDrivers } from "@/shared/api/openf1";
import Panel from "@/shared/components/Panel";
import type { Lap, Driver } from "@/shared/types/api";
import { summarizeLaps } from "@/shared/utils/laps";

interface PracticeTimingProps {
  sessionKey: number;
  sessionType: "Practice" | "Qualifying";
}

interface DriverLapSummary {
  driver_number: number;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  totalLaps: number;
  bestLap: number | null;
  bestS1: number | null;
  bestS2: number | null;
  bestS3: number | null;
  topSpeed: number | null;
}

export default function PracticeTiming({ sessionKey, sessionType }: PracticeTimingProps) {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Poll laps data
  useEffect(() => {
    let mounted = true;
    const fetchLaps = async () => {
      try {
        const [l, d] = await Promise.all([getLaps(sessionKey), getDrivers(sessionKey)]);
        if (!mounted) return;
        setLaps(l);
        setDrivers(d);
      } catch {
        // silent
      }
    };

    fetchLaps();
    const interval = setInterval(fetchLaps, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  const summaries = useMemo(() => {
    const driverMap = new Map<number, Driver>();
    for (const d of drivers) {
      driverMap.set(d.driver_number, d);
    }

    const result: DriverLapSummary[] = [];

    for (const [dn, lapSummary] of summarizeLaps(laps).drivers) {
      const driver = driverMap.get(dn);
      result.push({
        driver_number: dn,
        name_acronym: driver?.name_acronym ?? `#${dn}`,
        team_name: driver?.team_name ?? "",
        team_colour: driver?.team_colour ?? "#666",
        totalLaps: lapSummary.cleanLaps,
        bestLap: lapSummary.bestLap,
        bestS1: lapSummary.bestS1,
        bestS2: lapSummary.bestS2,
        bestS3: lapSummary.bestS3,
        topSpeed: lapSummary.topSpeed,
      });
    }

    // Sort by best lap (fastest first), drivers with no clean lap at the bottom
    return result.toSorted((a, b) => {
      if (a.bestLap == null && b.bestLap == null) return 0;
      if (a.bestLap == null) return 1;
      if (b.bestLap == null) return -1;
      return a.bestLap - b.bestLap;
    });
  }, [laps, drivers]);

  if (laps.length === 0 && drivers.length === 0) return null;

  const fastestTime = summaries.length > 0 ? summaries[0].bestLap : null;

  return (
    <Panel title={`${sessionType} Timing`} meta={`${summaries.length} drivers`}>
      {summaries.length === 0 ? (
        <div className="px-3 py-4 text-xs text-f1-dim text-center">Waiting for lap data...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr className="bg-f1-bg3/50 text-[10px] text-f1-dim font-semibold uppercase tracking-wider">
                <th className="px-2 py-1.5 text-left w-6">#</th>
                <th className="px-2 py-1.5 text-left">Driver</th>
                <th className="px-2 py-1.5 text-right">Laps</th>
                <th className="px-2 py-1.5 text-right">Best</th>
                <th className="px-2 py-1.5 text-right">Gap</th>
                <th className="px-2 py-1.5 text-right">S1</th>
                <th className="px-2 py-1.5 text-right">S2</th>
                <th className="px-2 py-1.5 text-right">S3</th>
                <th className="px-2 py-1.5 text-right">Speed</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s, i) => {
                const gap =
                  s.bestLap != null && fastestTime != null ? s.bestLap - fastestTime : null;
                return (
                  <tr
                    key={s.driver_number}
                    className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/30 transition-colors"
                    style={{
                      borderLeft: `3px solid ${s.team_colour}`,
                    }}
                  >
                    <td className="px-2 py-1.5 text-[11px] text-f1-dim tabular-nums w-6">
                      {i + 1}
                    </td>
                    <td className="px-2 py-1.5 text-xs font-semibold text-f1-bright">
                      {s.name_acronym}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-dim tabular-nums text-right">
                      {s.totalLaps}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-green tabular-nums text-right font-medium">
                      {s.bestLap != null ? `${s.bestLap.toFixed(3)}` : "—:—.———"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-orange tabular-nums text-right">
                      {gap != null && gap > 0
                        ? `+${gap.toFixed(3)}`
                        : gap != null && gap === 0
                          ? "—"
                          : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-dim tabular-nums text-right">
                      {s.bestS1 != null ? s.bestS1.toFixed(3) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-dim tabular-nums text-right">
                      {s.bestS2 != null ? s.bestS2.toFixed(3) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-dim tabular-nums text-right">
                      {s.bestS3 != null ? s.bestS3.toFixed(3) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-f1-blue tabular-nums text-right">
                      {s.topSpeed != null ? `${s.topSpeed}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
