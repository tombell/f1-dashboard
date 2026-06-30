import { useMemo } from "react";

import type { Lap } from "@/shared/types/api";
import { summarizeLaps } from "@/shared/utils/laps";

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
    return [...summarizeLaps(laps).drivers.values()].toSorted((a, b) => {
      if (a.bestLap === null && b.bestLap === null) return 0;
      if (a.bestLap === null) return 1;
      if (b.bestLap === null) return -1;
      return a.bestLap - b.bestLap;
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
              key={ls.driverNumber}
              className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
            >
              <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                <DriverCell driverNumber={ls.driverNumber} driverMap={driverMap} />
              </td>
              <td className="px-3 py-2 text-xs text-f1-green tabular-nums">
                {ls.bestLap != null ? `${ls.bestLap.toFixed(3)}s` : "-"}
              </td>
              <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">
                {ls.averageLap != null ? `${ls.averageLap.toFixed(3)}s` : "-"}
              </td>
              <td className="px-3 py-2 text-xs text-f1-dim">{ls.cleanLaps}</td>
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
