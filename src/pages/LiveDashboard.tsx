import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import WeatherBar from "@/components/WeatherBar";
import TimingTower from "@/components/TimingTower";
import RaceControl from "@/components/RaceControl";
import { getLatestSession, getDrivers, getPositions, getIntervals, getWeather } from "@/api/openf1";
import type { Session, Driver, Position, Interval, WeatherReading } from "@/types/api";

export default function LiveDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [weather, setWeather] = useState<WeatherReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const sessionKey = searchParams.get("session") ? Number(searchParams.get("session")) : undefined;

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(
      async () => {
        try {
          const s = sessionKey
            ? await (await fetch(`/v1/sessions?session_key=${sessionKey}`)).json()
            : await getLatestSession();
          const sess = Array.isArray(s) ? s[0] : s;
          if (!sess) return;
          if (!mounted) return;
          setSession(sess);

          const sk = sess.session_key;
          const [d, p, i, w] = await Promise.all([
            getDrivers(sk),
            getPositions(sk),
            getIntervals(sk),
            getWeather(sk),
          ]);
          if (!mounted) return;
          setDrivers(d);
          setPositions(p);
          setIntervals(i);
          setWeather(w);
          setError(null);
        } catch (e: unknown) {
          if (!mounted) return;
          setError(e instanceof Error ? e.message : "Connection error");
        }
      },
      sessionKey ? 5000 : 3000,
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  const latestWeather = weather.length > 0 ? weather[weather.length - 1] : null;
  const latestPositions = positions.reduce((map, p) => {
    map.set(p.driver_number, p);
    return map;
  }, new Map<number, Position>());

  return (
    <div className="flex flex-col gap-3 p-4 h-full min-h-screen">
      <Header session={session} onRefresh={() => setError(null)} />
      <WeatherBar weather={latestWeather} />
      {error && (
        <div className="bg-f1-bg3 border border-f1-red/30 rounded-lg px-4 py-2 text-f1-red text-xs">
          {error}
        </div>
      )}
      <div className="flex-1 grid grid-cols-[1.8fr_1fr] gap-3 min-h-0 max-lg:grid-cols-1">
        <TimingTower drivers={drivers} positions={latestPositions} intervals={intervals} />
        <RaceControl sessionKey={session?.session_key} />
      </div>
    </div>
  );
}
