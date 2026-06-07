import { useState, useMemo } from "react";
import type React from "react";

import type { SessionResult } from "@/types/api";

interface SessionResultsProps {
  results: SessionResult[];
  grid: SessionResult[];
  sessionType: string;
  sessionName: string;
}

function dnShort(r: SessionResult): string {
  return r.name_acronym || r.broadcast_name?.split(" ").pop() || `#${r.driver_number}`;
}

function driverName(r: SessionResult): string {
  return r.broadcast_name || r.full_name || `Driver #${r.driver_number}`;
}

function driverColorStyle(teamColour: string | undefined | null): React.CSSProperties {
  return { color: teamColour ? `#${teamColour}` : undefined };
}

function raceTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}m${s.toFixed(2)}s`;
  if (m > 0) return `${m}m${s.toFixed(3)}s`;
  return `${s.toFixed(3)}s`;
}

type TableType = "practice" | "qualifying" | "race";

function detectTableType(results: SessionResult[], sessionType: string): TableType {
  if (sessionType === "Qualifying" || sessionType === "SprintQualifying") return "qualifying";
  if (sessionType === "Race") return "race";
  // Check if it has qualifying-style duration arrays
  if (results.some((r) => Array.isArray(r.duration))) return "qualifying";
  return "practice";
}

export default function SessionResults({
  results,
  grid,
  sessionType,
  sessionName,
}: SessionResultsProps) {
  const tableType = useMemo(() => detectTableType(results, sessionType), [results, sessionType]);
  const isSprint = sessionName.toLowerCase().includes("sprint");
  const segLabels = useMemo(() => (isSprint ? ["SQ1", "SQ2", "SQ3"] : ["Q1", "Q2", "Q3"]), [isSprint]);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [gridOpen, setGridOpen] = useState(true);

  // Qualifying: find fastest time in each segment
  const segFastest = useMemo(() => {
    if (tableType !== "qualifying") return {};
    const fastest: Record<number, { time: number; driver_number: number }> = {};
    results.forEach((r) => {
      if (!Array.isArray(r.duration)) return;
      const t = r.duration as number[];
      for (let i = 0; i < Math.min(t.length, 3); i++) {
        if (t[i] != null) {
          if (!fastest[i] || t[i] < fastest[i].time) {
            fastest[i] = { time: t[i], driver_number: r.driver_number };
          }
        }
      }
    });
    return fastest;
  }, [results, tableType]);

  // Sort by position (null positions go to end)
  const sorted = [...results].toSorted((a, b) => (a.position ?? 999) - (b.position ?? 999));

  return (
    <>
      {/* Main results table */}
      <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden mt-1.5">
        <button
          /* eslint-disable-next-line jsx-no-new-function-as-prop */
          onClick={() => setResultsOpen((o) => !o)}
          className="w-full text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center cursor-pointer bg-transparent border-t-0 border-x-0 hover:bg-f1-bg3 transition-colors"
        >
          <span>{sessionName} Results</span>
          <span className="flex items-center gap-2">
            <span className="text-f1-dim text-[11px]">{results.length} drivers</span>
            <span className={`transition-transform ${resultsOpen ? "rotate-0" : "-rotate-90"}`}>
              ▼
            </span>
          </span>
        </button>

        {resultsOpen && (
          <>
            {tableType === "practice" && <PracticeTable results={sorted} />}
            {tableType === "qualifying" && (
              <QualifyingTable
                results={sorted}
                segLabels={segLabels}
                segFastest={segFastest as Record<number, { time: number; driver_number: number }>}
              />
            )}
            {tableType === "race" && <RaceTable results={sorted} />}
          </>
        )}
      </div>

      {/* Starting grid */}
      {grid.length > 0 && (
        <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden mt-1.5">
          <button
            /* eslint-disable-next-line jsx-no-new-function-as-prop */
            onClick={() => setGridOpen((o) => !o)}
            className="w-full text-xs font-semibold text-f1-bright px-4 py-3 border-b border-f1-border flex justify-between items-center cursor-pointer bg-transparent border-t-0 border-x-0 hover:bg-f1-bg3 transition-colors"
          >
            <span>🏁 Starting Grid ({grid.length} drivers)</span>
            <span className={`transition-transform ${gridOpen ? "rotate-0" : "-rotate-90"}`}>
              ▼
            </span>
          </button>
          {gridOpen && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-f1-bg3">
                  <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
                    Pos
                  </th>
                  <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
                    Driver
                  </th>
                  <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
                    Lap Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...grid]
                  .toSorted((a, b) => (a.position ?? 999) - (b.position ?? 999))
                  .map((g) => (
                    <tr
                      key={`${g.driver_number}-${g.position}`}
                      className={`border-b border-f1-border last:border-b-0 hover:bg-f1-bg3 ${
                        g.position === 1 ? "bg-f1-bg3/50" : ""
                      }`}
                    >
                      <td className={`px-3 py-2 text-xs font-bold ${posColor(g.position)}`}>
                        P{g.position}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          style={driverColorStyle(g.team_colour)}
                          className="font-semibold"
                        >
                          {driverName(g)}
                        </span>
                        <span className="ml-1.5 text-[11px] text-f1-dim">· {g.team_name}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">
                        {g.duration != null && typeof g.duration === "number"
                          ? `${g.duration.toFixed(3)}s`
                          : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}

function posColor(pos: number | null): string {
  if (pos === 1) return "text-f1-green";
  if (pos === 2 || pos === 3) return "text-f1-blue";
  return "text-f1-bright";
}

function PracticeTable({ results }: { results: SessionResult[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-f1-bg3">
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Pos
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Driver
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Laps
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Best Lap
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Gap
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr
            key={r.driver_number}
            className={`border-b border-f1-border last:border-b-0 hover:bg-f1-bg3 ${
              r.position === 1 ? "bg-f1-bg3/50" : ""
            }`}
          >
            <td className={`px-3 py-2 text-xs font-bold ${posColor(r.position)}`}>P{r.position}</td>
            <td className="px-3 py-2 text-xs">
              <span
                style={driverColorStyle(r.team_colour)}
                className="font-semibold"
              >
                {driverName(r)}
              </span>
              <span className="ml-1.5 text-[11px] text-f1-dim">· {r.team_name}</span>
            </td>
            <td className="px-3 py-2 text-xs">{r.lap_count ?? "-"}</td>
            <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">
              {r.duration != null && !Array.isArray(r.duration)
                ? `${(r.duration as number).toFixed(3)}s`
                : "-"}
            </td>
            <td className="px-3 py-2 text-xs text-f1-orange">
              {r.gap === "0" ? "—" : r.gap || "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QualifyingTable({
  results,
  segLabels,
  segFastest,
}: {
  results: SessionResult[];
  segLabels: string[];
  segFastest: Record<number, { time: number; driver_number: number }>;
}) {
  // Build header label with fastest-per-segment info
  const flHeader = [0, 1, 2]
    .filter((i) => segFastest[i])
    .map((i) => {
      const driver = results.find((r) => r.driver_number === segFastest[i].driver_number);
      return `🏁 ${driver ? dnShort(driver) : `#${segFastest[i].driver_number}`} — ${segFastest[i].time.toFixed(3)}s`;
    })
    .join(" · ");

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-f1-bg3">
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Pos
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Driver {flHeader && <span className="font-normal text-[11px]">· {flHeader}</span>}
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            {segLabels[0]}
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            {segLabels[1]}
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            {segLabels[2]}
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Laps
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => {
          const t = (Array.isArray(r.duration) ? r.duration : []) as number[];
          const badges = [0, 1, 2]
            .filter((i) => segFastest[i]?.driver_number === r.driver_number)
            .map((i) => (
              <span
                key={i}
                className="text-f1-orange font-bold text-[11px]"
                title={`Fastest ${segLabels[i]}`}
              >
                {" "}
                🏁 {segLabels[i]}
              </span>
            ));

          return (
            <tr
              key={r.driver_number}
              className={`border-b border-f1-border last:border-b-0 hover:bg-f1-bg3 ${
                r.position === 1 ? "bg-f1-bg3/50" : ""
              }`}
            >
              <td className={`px-3 py-2 text-xs font-bold ${posColor(r.position)}`}>
                P{r.position}
              </td>
              <td className="px-3 py-2 text-xs">
                <span
                  style={driverColorStyle(r.team_colour)}
                  className="font-semibold"
                >
                  {driverName(r)}
                </span>
                <span className="ml-1.5 text-[11px] text-f1-dim">· {r.team_name}</span>
                {badges}
              </td>
              {[0, 1, 2].map((i) => (
                <td key={i} className="px-3 py-2 text-xs tabular-nums">
                  {t[i] != null ? (
                    <span
                      className={
                        segFastest[i]?.driver_number === r.driver_number &&
                        t[i] === segFastest[i]?.time
                          ? "text-f1-orange font-bold"
                          : "text-f1-dim"
                      }
                    >
                      {t[i].toFixed(3)}s
                    </span>
                  ) : (
                    <span className="text-f1-dim">-</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-xs text-f1-dim">{r.lap_count ?? "-"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RaceTable({ results }: { results: SessionResult[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-f1-bg3">
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Pos
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Driver
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Laps
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Time
          </th>
          <th className="text-[11px] text-f1-dim font-semibold uppercase tracking-wider px-3 py-2 text-left">
            Gap
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => {
          const isDNF = r.status === "DNF" || r.classified === "DNF";
          const isDNS = r.status === "DNS" || r.classified === "DNS";
          const isDSQ = r.status === "DSQ" || r.classified === "DSQ";
          const statusLabel = isDNF ? "DNF" : isDNS ? "DNS" : isDSQ ? "DSQ" : null;
          const time =
            r.duration != null && !Array.isArray(r.duration) ? raceTime(r.duration as number) : "-";

          return (
            <tr
              key={r.driver_number}
              className={`border-b border-f1-border last:border-b-0 hover:bg-f1-bg3 ${
                r.position === 1 ? "bg-f1-bg3/50" : ""
              } ${isDNF || isDNS || isDSQ ? "text-f1-dim" : ""}`}
            >
              <td className={`px-3 py-2 text-xs font-bold ${posColor(r.position)}`}>
                P{r.position}
                {statusLabel && (
                  <span className="text-f1-red text-[10px] font-semibold ml-1">{statusLabel}</span>
                )}
              </td>
              <td className="px-3 py-2 text-xs">
                <span
                  style={driverColorStyle(r.team_colour)}
                  className="font-semibold"
                >
                  {driverName(r)}
                </span>
                <span className="ml-1.5 text-[11px] text-f1-dim">· {r.team_name}</span>
              </td>
              <td className="px-3 py-2 text-xs">{r.lap_count ?? "-"}</td>
              <td className="px-3 py-2 text-xs text-f1-dim tabular-nums">{time}</td>
              <td className="px-3 py-2 text-xs text-f1-orange">
                {r.gap === "0" ? "—" : r.gap || "-"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
