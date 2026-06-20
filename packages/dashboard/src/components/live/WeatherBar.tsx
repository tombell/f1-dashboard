import type { WeatherReading } from "@/shared/types/api";

interface WeatherBarProps {
  weather: WeatherReading | null;
}

export default function WeatherBar({ weather }: WeatherBarProps) {
  if (!weather) return null;

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg px-5 py-2 flex gap-5 text-xs flex-wrap">
      <Stat label="Air" value={`${weather.air_temperature ?? "—"}°C`} />
      <Stat label="Track" value={`${weather.track_temperature ?? "—"}°C`} />
      <Stat label="Humidity" value={`${weather.humidity ?? "—"}%`} />
      <Stat label="Wind" value={`${weather.wind_speed ?? "—"} m/s`} />
      <Stat
        label="Rain"
        value={weather.rainfall ? "🌧️ Yes" : "☀️ No"}
        highlight={weather.rainfall ? "text-f1-blue" : "text-f1-green"}
      />
      <Stat label="Pressure" value={weather.pressure ? `${weather.pressure} hPa` : "—"} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-f1-dim">{label}</span>
      <span className={`text-f1-bright font-semibold ${highlight ?? ""}`}>{value}</span>
    </span>
  );
}
