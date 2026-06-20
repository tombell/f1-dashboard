import { useMemo } from "react";

import type { Lap } from "@/types/api";

import DriverCell from "./DriverCell";
import LiveSection from "./LiveSection";

interface LapTimesTableProps {
  laps: Lap[];
  driverMap: Map<
    number,
    { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
  >;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export default function LapTimesTable({
  laps,
  driverMap,
  collapsed,
  onToggle,
}: LapTimesTableProps) {
  const summaries = useMemo(() => {
    const driverLaps = new Map<number, Lap[]>();
    for (const lap of laps) {
      if (!driverLaps.has(lap.driver_number)) {
        driverLaps.set(lap.driver_number, []);
      }
      driverLaps.get(lap.driver_number)!.push(lap);
    }

    return [...driverLaps.entries()]
      .map(([dn, dl]) => {
        const cleanLaps = dl.filter((l) => l.lap_duration != null && !l.is_pit_out_lap);
        const fastest = cleanLaps.reduce(
          (best, l) => (l.lap_duration != null && l.lap_duration < best ? l.lap_duration : best),
          Infinity,
        );
        const avg =
          cleanLaps.length > 0
            ? cleanLaps.reduce((s, l) => s + (l.lap_duration ?? 0), 0) / cleanLaps.length
            : 0;
        const topSpeed = Math.max(...dl.map((l) => l.st_speed_trap ?? 0), 0);
        return {
          driver_number: dn,
          fastest: fastest !== Infinity ? fastest : null,
          average: avg || null,
          cleanCount: cleanLaps.length,
          totalLaps: dl.length,
          topSpeed: topSpeed > 0 ? topSpeed : null,
        };
      })
      .toSorted((a, b) => {
        // Fastest lap ascending — nulls (no clean lap) at the bottom
        if (a.fastest === null && b.fastest === null) return 0;
        if (a.fastest === null) return 1;
        if (b.fastest === null) return -1;
        return a.fastest - b.fastest;
      });
  }, [laps]);

  if (laps.length === 0) return null;

  return (
    <LiveSection title="🏁 Lap Times" sectionKey="laps" collapsed={collapsed} onToggle={onToggle}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
            <th className="px-3 py-2 text-left">Driver</th>
            <th className="px-3 py-2 text-left">Fastest</th>
            <th className="px-3 py-2 text-left">Avg</th>
            <th className="px-3 py-2 text-left">Clean</th>
            <th className="px-3 py-2 text-left">Total</th>
            <th className="px-3 py-2 text-left">Top Speed</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((ls) => (
            <tr
              key={ls.driver_number}
              className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
            >
              <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                <DriverCell driverNumber={ls.driver_number} driverMap={driverMap} />
              </td>
              <td className="px-3 py-2 text-xs text-f1-green tabular-nums">
                {ls.fastest ? `${ls.fastest.toFixed(3)}s` : "-"}
              </td>
              <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">
                {ls.average ? `${ls.average.toFixed(3)}s` : "-"}
              </td>
              <td className="px-3 py-2 text-xs text-f1-dim">{ls.cleanCount}</td>
              <td className="px-3 py-2 text-xs text-f1-dim">{ls.totalLaps}</td>
              <td className="px-3 py-2 text-xs text-f1-blue tabular-nums">
                {ls.topSpeed ? `${ls.topSpeed} km/h` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </LiveSection>
  );
}
