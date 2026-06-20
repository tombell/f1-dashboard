import { getLaps, getDrivers } from "@f1-dashboard/shared/api/openf1";
import type { Lap, Driver } from "@f1-dashboard/shared/types/api";
import { useEffect, useState, useMemo } from "react";

interface PracticeTimingProps {
  sessionKey: number;
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

export default function PracticeTiming({ sessionKey }: PracticeTimingProps) {
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

    const driverLaps = new Map<number, Lap[]>();
    for (const lap of laps) {
      if (!driverLaps.has(lap.driver_number)) {
        driverLaps.set(lap.driver_number, []);
      }
      driverLaps.get(lap.driver_number)!.push(lap);
    }

    const result: DriverLapSummary[] = [];

    for (const [dn, dl] of driverLaps) {
      const cleanLaps = dl.filter((l) => l.lap_duration != null && !l.is_pit_out_lap);
      const best = cleanLaps.reduce(
        (b, l) => (l.lap_duration != null && l.lap_duration < b ? l.lap_duration : b),
        Infinity,
      );

      // Best sector times across all laps (not necessarily from same lap)
      const bestS1 = cleanLaps.reduce(
        (b, l) =>
          l.duration_sector_1 != null && l.duration_sector_1 < b ? l.duration_sector_1 : b,
        Infinity,
      );
      const bestS2 = cleanLaps.reduce(
        (b, l) =>
          l.duration_sector_2 != null && l.duration_sector_2 < b ? l.duration_sector_2 : b,
        Infinity,
      );
      const bestS3 = cleanLaps.reduce(
        (b, l) =>
          l.duration_sector_3 != null && l.duration_sector_3 < b ? l.duration_sector_3 : b,
        Infinity,
      );

      const topSpeed = Math.max(...dl.map((l) => l.st_speed_trap ?? 0), 0);

      const driver = driverMap.get(dn);
      result.push({
        driver_number: dn,
        name_acronym: driver?.name_acronym ?? `#${dn}`,
        team_name: driver?.team_name ?? "",
        team_colour: driver?.team_colour ?? "#666",
        totalLaps: cleanLaps.length,
        bestLap: best !== Infinity ? best : null,
        bestS1: bestS1 !== Infinity ? bestS1 : null,
        bestS2: bestS2 !== Infinity ? bestS2 : null,
        bestS3: bestS3 !== Infinity ? bestS3 : null,
        topSpeed: topSpeed > 0 ? topSpeed : null,
      });
    }

    // Sort by best lap (fastest first), drivers with no clean lap at the bottom
    result.sort((a, b) => {
      if (a.bestLap == null && b.bestLap == null) return 0;
      if (a.bestLap == null) return 1;
      if (b.bestLap == null) return -1;
      return a.bestLap - b.bestLap;
    });

    return result;
  }, [laps, drivers]);

  if (laps.length === 0 && drivers.length === 0) return null;

  const fastestTime = summaries.length > 0 ? summaries[0].bestLap : null;

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-f1-bg3 text-[11px] text-f1-dim uppercase tracking-wider flex items-center gap-2">
        <span>⏱ Practice Timing</span>
        <span className="text-[10px] text-f1-dim font-normal">({summaries.length} drivers)</span>
      </div>
      {summaries.length === 0 ? (
        <div className="px-3 py-4 text-xs text-f1-dim text-center">Waiting for lap data...</div>
      ) : (
        <table className="w-full border-collapse">
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
              const gap = s.bestLap != null && fastestTime != null ? s.bestLap - fastestTime : null;
              return (
                <tr
                  key={s.driver_number}
                  className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/30 transition-colors"
                  style={{
                    borderLeft: `3px solid ${s.team_colour}`,
                  }}
                >
                  <td className="px-2 py-1.5 text-[11px] text-f1-dim tabular-nums w-6">{i + 1}</td>
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
      )}
    </div>
  );
}
