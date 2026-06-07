import { useMemo } from "react";
import { MONACO_TRACK, TRACK_BOUNDS } from "@/data/monaco-track";

interface TrackLocation {
  driver_number: number;
  x: number;
  y: number;
  date: string;
}

interface TrackMapProps {
  locations: TrackLocation[];
  nameMap: Map<number, string>;
}

// Map team colors
const TEAM_COLORS: Record<string, string> = {
  McLaren: "#ff8700",
  "Red Bull Racing": "#3671c6",
  Ferrari: "#dc0000",
  Mercedes: "#00d2be",
  "Aston Martin": "#006f62",
  Alpine: "#ff87bc",
  Williams: "#005aff",
  "Haas F1 Team": "#b6b6b6",
  "Racing Bulls": "#e02d6b",
  Audi: "#222222",
  Cadillac: "#8b0000",
};

// Normalize track coordinates to SVG viewBox
const W = 720;
const H = 900;
const PAD = 40;

function toSvg(x: number, y: number): { sx: number; sy: number } {
  const { minX, maxX, minY, maxY } = TRACK_BOUNDS;
  const sx = PAD + ((x - minX) / (maxX - minX)) * (W - 2 * PAD);
  const sy = PAD + ((y - minY) / (maxY - minY)) * (H - 2 * PAD);
  return { sx, sy };
}

export default function TrackMap({ locations, nameMap }: TrackMapProps) {
  const trackPath = useMemo(() => {
    return MONACO_TRACK.map((p, i) => {
      const { sx, sy } = toSvg(p.x, p.y);
      return `${i === 0 ? "M" : "L"}${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(" ");
  }, []);

  // Build driver dot positions
  const dots = useMemo(() => {
    return locations.map((loc) => {
      const { sx, sy } = toSvg(loc.x, loc.y);
      const name = nameMap.get(loc.driver_number) ?? `#${loc.driver_number}`;
      return { ...loc, sx, sy, name };
    });
  }, [locations, nameMap]);

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-f1-bg3 text-[11px] text-f1-dim uppercase tracking-wider">
        Track Map
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: "300px" }}
      >
        {/* Track outline */}
        <path
          d={trackPath}
          fill="none"
          stroke="#444466"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.6}
        />

        {/* Driver dots */}
        {dots.map((d) => (
          <g key={d.driver_number}>
            {/* Glow */}
            <circle cx={d.sx} cy={d.sy} r={6} fill="#fff" opacity={0.15} />
            {/* Dot */}
            <circle
              cx={d.sx}
              cy={d.sy}
              r={4}
              fill={TEAM_COLORS[nameMap.get(d.driver_number) ?? ""] ?? "#888"}
              stroke="#fff"
              strokeWidth={1.5}
            >
              <title>{d.name}</title>
            </circle>
          </g>
        ))}

        {/* No positions */}
        {dots.length === 0 && (
          <text
            x={W / 2}
            y={H / 2}
            textAnchor="middle"
            fill="#666688"
            fontSize={14}
          >
            No position data
          </text>
        )}
      </svg>
    </div>
  );
}
