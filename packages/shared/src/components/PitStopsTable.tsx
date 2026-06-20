import type { PitStop } from "@f1-dashboard/shared/types/api";

import DriverCell from "./DriverCell";
import LiveSection from "./LiveSection";

interface PitStopsTableProps {
  pits: PitStop[];
  driverMap: Map<
    number,
    { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
  >;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export default function PitStopsTable({
  pits,
  driverMap,
  collapsed,
  onToggle,
}: PitStopsTableProps) {
  if (pits.length === 0) return null;

  return (
    <LiveSection title="🛑 Pit Stops" sectionKey="pits" collapsed={collapsed} onToggle={onToggle}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
            <th className="px-3 py-2 text-left">Driver</th>
            <th className="px-3 py-2 text-left">Lap</th>
            <th className="px-3 py-2 text-left">Stop</th>
            <th className="px-3 py-2 text-left">Total</th>
            <th className="px-3 py-2 text-left">Lane</th>
            <th className="px-3 py-2 text-left">Type</th>
          </tr>
        </thead>
        <tbody>
          {pits
            .toSorted((a, b) => (a.lap_number ?? 0) - (b.lap_number ?? 0))
            .slice(-50)
            .map((p) => (
              <tr
                key={`${p.driver_number}_${p.lap_number}_${p.pit_duration}`}
                className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3"
              >
                <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                  <DriverCell driverNumber={p.driver_number} driverMap={driverMap} />
                </td>
                <td className="px-3 py-2 text-xs">L{p.lap_number}</td>
                <td className="px-3 py-2 text-xs text-f1-dim">
                  {p.pit_duration != null ? `${p.pit_duration.toFixed(1)}s` : "-"}
                </td>
                <td className="px-3 py-2 text-xs text-f1-dim">
                  {p.stop_time != null ? `${p.stop_time.toFixed(1)}s` : "-"}
                </td>
                <td className="px-3 py-2 text-xs text-f1-dim">
                  {p.lane_time != null ? `${p.lane_time.toFixed(1)}s` : "-"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.tyre_change ? (
                    <span className="text-f1-yellow">Tyre change</span>
                  ) : (
                    <span className="text-f1-dim">—</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </LiveSection>
  );
}
