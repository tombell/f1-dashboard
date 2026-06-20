import { useRef, useEffect, useMemo, useState } from "react";

import { getLocation } from "@/shared/api/openf1";
import type { Location, Driver, Session } from "@/shared/types/api";

interface TrackMapProps {
  session: Session | null;
  drivers: Driver[];
}

type Point = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

function getBounds(points: Point[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function normalisePoint(p: Point, bounds: Bounds): Point {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const pad = 0.06;
  return {
    x: ((p.x - bounds.minX) / rangeX) * (1 - 2 * pad) + pad,
    y: (1 - (p.y - bounds.minY) / rangeY) * (1 - 2 * pad) + pad,
  };
}

function normalise(points: Point[], bounds: Bounds): Point[] {
  return points.map((p) => normalisePoint(p, bounds));
}

function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let dmax = 0,
    idx = 0;
  const first = points[0],
    last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], first, last);
    if (d > dmax) {
      dmax = d;
      idx = i;
    }
  }
  if (dmax > epsilon) {
    const left = simplify(points.slice(0, idx + 1), epsilon);
    const right = simplify(points.slice(idx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDist(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

function buildTrace(locations: Location[]): Point[] {
  const sorted = locations
    .filter((l) => Number.isFinite(l.x) && Number.isFinite(l.y))
    .toSorted((a, b) => a.date.localeCompare(b.date));

  const result: Point[] = [];
  const eps = 8;
  for (const loc of sorted) {
    const last = result[result.length - 1];
    if (!last || Math.hypot(loc.x - last.x, loc.y - last.y) > eps) {
      result.push({ x: loc.x, y: loc.y });
    }
  }
  return result;
}

function minusSeconds(iso: string, seconds: number) {
  const d = new Date(iso);
  d.setSeconds(d.getSeconds() - seconds);
  return d.toISOString();
}

async function getRecentLocations(sessionKey: number, since: string): Promise<Location[]> {
  const response = await fetch(
    `/v1/location?session_key=${sessionKey}&date>=${encodeURIComponent(since)}`,
  );
  if (!response.ok) throw new Error(`location ${response.status}`);
  return response.json();
}

export default function TrackMap({ session, drivers }: TrackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [circuitLocations, setCircuitLocations] = useState<Location[]>([]);
  const [carLocations, setCarLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  const traceDriver = drivers[0]?.driver_number ?? 16;

  useEffect(() => {
    if (!session) return;
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        const trace = await getLocation(session.session_key, traceDriver);
        if (!mounted) return;
        setCircuitLocations(trace);

        const latestTraceDate = trace.reduce((max, l) => (l.date > max ? l.date : max), "");
        const since = latestTraceDate
          ? minusSeconds(latestTraceDate, 30)
          : minusSeconds(new Date().toISOString(), 30);
        const recent = await getRecentLocations(session.session_key, since);
        if (!mounted) return;
        setCarLocations(recent);
        setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session, traceDriver]);

  const trace = useMemo(() => buildTrace(circuitLocations), [circuitLocations]);
  const bounds = useMemo(() => getBounds(trace), [trace]);
  const circuitPoints = useMemo(() => {
    if (!bounds || trace.length < 50) return [];
    return normalise(simplify(trace, 0.005), bounds);
  }, [trace, bounds]);

  const driverPositions = useMemo(() => {
    if (!bounds) return [];
    const latest = new Map<number, Location>();
    for (const loc of carLocations) {
      const prev = latest.get(loc.driver_number);
      if (!prev || loc.date > prev.date) latest.set(loc.driver_number, loc);
    }
    return [...latest.entries()].map(([driverNumber, loc]) => {
      const point = normalisePoint({ x: loc.x, y: loc.y }, bounds);
      return { driverNumber, x: point.x, y: point.y };
    });
  }, [carLocations, bounds]);

  const driverMap = useMemo(() => {
    const map = new Map<number, Driver>();
    for (const d of drivers) map.set(d.driver_number, d);
    return map;
  }, [drivers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (circuitPoints.length < 50) {
      ctx.fillStyle = "#666";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(loading ? "Loading track data…" : "Waiting for location data…", w / 2, h / 2);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(circuitPoints[0].x * w, circuitPoints[0].y * h);
    for (let i = 1; i < circuitPoints.length; i++) {
      ctx.lineTo(circuitPoints[i].x * w, circuitPoints[i].y * h);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const sf = circuitPoints[0];
    ctx.beginPath();
    ctx.moveTo(sf.x * w - 8, sf.y * h);
    ctx.lineTo(sf.x * w + 8, sf.y * h);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3;
    ctx.stroke();

    for (const dp of driverPositions) {
      const driver = driverMap.get(dp.driverNumber);
      const colour = driver?.team_colour || "#888888";
      const label = driver?.name_acronym || String(dp.driverNumber);
      const px = dp.x * w;
      const py = dp.y * h;

      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fillStyle = `${colour}33`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "bold 9px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.strokeStyle = "rgba(0,0,0,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(label, px, py - 9);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, px, py - 9);
    }
  }, [circuitPoints, driverPositions, driverMap, loading]);

  return (
    <div className="relative bg-[#1a1a1e] rounded-lg overflow-hidden border border-white/5 min-h-[300px]">
      <canvas ref={canvasRef} className="w-full h-full min-h-[300px]" aria-label="Live track map" />
      <div className="absolute bottom-2 left-2 text-[10px] text-white/30 font-mono pointer-events-none select-none">
        TRACK MAP ·{" "}
        {circuitPoints.length > 50 ? `${circuitPoints.length} pts` : "acquiring circuit…"}
        {session?.circuit_short_name ? ` · ${session.circuit_short_name}` : ""}
      </div>
    </div>
  );
}
