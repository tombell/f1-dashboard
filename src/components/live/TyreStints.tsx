import { useMemo } from "react";

import { compoundColor } from "@/constants/f1";
import type { Lap, Stint } from "@/types/api";

import DriverCell from "./DriverCell";
import LiveSection from "./LiveSection";

interface TyreStintsProps {
  stints: Stint[];
  laps: Lap[];
  driverMap: Map<
    number,
    { broadcast_name: string; name_acronym: string; team_name: string; team_colour: string }
  >;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
  isRace: boolean;
}

export default function TyreStints({
  stints,
  laps,
  driverMap,
  collapsed,
  onToggle,
  isRace,
}: TyreStintsProps) {
  const stintsByDriver = useMemo(() => {
    const map = new Map<number, Stint[]>();
    for (const s of stints) {
      if (!map.has(s.driver_number)) map.set(s.driver_number, []);
      map.get(s.driver_number)!.push(s);
    }
    return map;
  }, [stints]);

  if (stints.length === 0) return null;

  return (
    <LiveSection
      title="🏎️ Tyre Stints"
      sectionKey="stints"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="divide-y divide-f1-border">
        {(() => {
          const driverLapTotals = [...stintsByDriver.entries()].map(([dn, driverStints]) => ({
            dn,
            stints: [...driverStints].toSorted((a, b) => a.lap_start - b.lap_start),
            total: driverStints.reduce((s, st) => s + (st.lap_end - st.lap_start + 1), 0),
          }));
          const maxTotal = Math.max(...driverLapTotals.map((d) => d.total), 1);

          return driverLapTotals
            .toSorted((a, b) => (a.stints[0]?.lap_start ?? 0) - (b.stints[0]?.lap_start ?? 0))
            .map(({ dn, stints: sorted }) => {
              const lapCompound = new Map<number, string>();
              for (const st of sorted) {
                for (let n = st.lap_start; n <= st.lap_end; n++) {
                  lapCompound.set(n, st.compound);
                }
              }

              const driverLaps = laps
                .filter((l) => l.driver_number === dn && l.lap_duration != null && !l.is_pitlap)
                .toSorted((a, b) => a.lap_number - b.lap_number);
              const fastestLap = driverLaps.reduce(
                (best, l) => (l.lap_duration! < best ? l.lap_duration! : best),
                Infinity,
              );

              return (
                <div key={dn} className="px-4 py-3">
                  <div className="mb-2">
                    <DriverCell driverNumber={dn} driverMap={driverMap} />
                  </div>

                  <div className="flex h-6 rounded overflow-hidden mb-1.5">
                    {sorted.map((st, idx) => {
                      const pct = ((st.lap_end - st.lap_start + 1) / maxTotal) * 100;
                      return (
                        <div
                          key={st.stint_number}
                          style={{
                            width: `${pct}%`,
                            backgroundColor: compoundColor(st.compound),
                            opacity: 0.6,
                            marginLeft: idx > 0 ? 2 : 0,
                            borderRadius:
                              sorted.length === 1
                                ? undefined
                                : idx === 0
                                  ? "4px 0 0 4px"
                                  : idx === sorted.length - 1
                                    ? "0 4px 4px 0"
                                    : undefined,
                          }}
                          className="flex items-center justify-center text-[10px] font-bold text-black/70 border-r border-black/10 last:border-r-0 shrink-0"
                          title={`${st.compound} L${st.lap_start}–${st.lap_end}`}
                        >
                          {pct > 12 ? st.compound : ""}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 text-[10px] text-f1-dim mb-2 flex-wrap">
                    {sorted.map((st) => (
                      <span key={st.stint_number}>
                        <span
                          className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                          style={{ backgroundColor: compoundColor(st.compound), opacity: 0.6 }}
                        />
                        {st.compound} L{st.lap_start}–{st.lap_end}
                      </span>
                    ))}
                  </div>

                  {isRace && driverLaps.length > 1 && fastestLap < Infinity && (
                    <div className="flex items-end gap-[1px] h-8">
                      {driverLaps.map((l) => {
                        const comp = lapCompound.get(l.lap_number) || "";
                        const ratio = fastestLap / l.lap_duration!;
                        const height = Math.max(4, Math.round(ratio * 28));
                        return (
                          <div
                            key={l.lap_number}
                            className="w-[3px] rounded-t-sm shrink-0"
                            style={{
                              height: `${height}px`,
                              backgroundColor: compoundColor(comp),
                              opacity: comp ? 0.55 : 0.3,
                            }}
                            title={`L${l.lap_number}: ${l.lap_duration?.toFixed(3)}s ${comp}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
        })()}
      </div>
    </LiveSection>
  );
}
