import type { Position } from "@f1-dashboard/shared/types/api";
import { useMemo } from "react";

import DriverCell from "./DriverCell";
import LiveSection from "./LiveSection";

interface PositionChangesTableProps {
  positions: Position[];
  driverMap: Map<
    number,
    { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
  >;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export default function PositionChangesTable({
  positions,
  driverMap,
  collapsed,
  onToggle,
}: PositionChangesTableProps) {
  const posChanges = useMemo(() => {
    const changes = new Map<number, { start: number | null; end: number | null }>();
    for (const pos of positions) {
      if (!changes.has(pos.driver_number)) {
        changes.set(pos.driver_number, { start: null, end: null });
      }
      const entry = changes.get(pos.driver_number)!;
      if (entry.start === null) entry.start = pos.position;
      entry.end = pos.position;
    }
    return changes;
  }, [positions]);

  if (positions.length === 0) return null;

  return (
    <LiveSection
      title="📊 Position Changes"
      sectionKey="positions"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-f1-bg3 text-[11px] text-f1-dim font-semibold uppercase tracking-wider">
            <th className="px-3 py-2 text-left">Driver</th>
            <th className="px-3 py-2 text-left">Start</th>
            <th className="px-3 py-2 text-left">End</th>
            <th className="px-3 py-2 text-left">Change</th>
          </tr>
        </thead>
        <tbody>
          {[...posChanges.entries()]
            .toSorted(([, a], [, b]) => (a.start ?? 99) - (b.start ?? 99))
            .map(([dn, ch]) => {
              const net = ch.start != null && ch.end != null ? ch.start - ch.end : 0;
              return (
                <tr key={dn} className="border-b border-f1-border last:border-b-0 hover:bg-f1-bg3">
                  <td className="px-3 py-2 text-xs font-semibold text-f1-bright">
                    <DriverCell driverNumber={dn} driverMap={driverMap} />
                  </td>
                  <td className="px-3 py-2 text-xs text-f1-dim">
                    {ch.start != null ? `P${ch.start}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-f1-dim">
                    {ch.end != null ? `P${ch.end}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold">
                    {net > 0 ? (
                      <span className="text-f1-green">▲{net}</span>
                    ) : net < 0 ? (
                      <span className="text-f1-red">▼{Math.abs(net)}</span>
                    ) : (
                      <span className="text-f1-dim">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </LiveSection>
  );
}
