import { getTeamRadio } from "@f1-dashboard/shared/api/openf1";
import type { TeamRadioEntry } from "@f1-dashboard/shared/types/api";
import { useEffect, useState, useRef, useCallback } from "react";

interface TeamRadioProps {
  sessionKey: number | undefined;
  drivers: Map<number, string>; // driver_number -> name_acronym
}

export default function TeamRadio({ sessionKey, drivers }: TeamRadioProps) {
  const [entries, setEntries] = useState<TeamRadioEntry[]>([]);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenKeys = useRef<Set<string>>(new Set());

  const playAudio = useCallback(
    (recordingUrl: string) => {
      if (playingUrl === recordingUrl) {
        // Toggle pause
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingUrl(null);
        }
        return;
      }

      // Build proxy URL: /v1/radio-proxy/{path after /static/}
      const staticIdx = recordingUrl.indexOf("/static/");
      if (staticIdx === -1) return;
      const path = recordingUrl.slice(staticIdx + 8); // after "/static/"
      const proxyUrl = `/v1/radio-proxy/${path}`;

      // Stop previous if any
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(proxyUrl);
      audioRef.current = audio;
      audio.play().catch(() => {
        // Autoplay may be blocked; user gesture should handle it
      });
      setPlayingUrl(recordingUrl);
      audio.addEventListener("ended", () => {
        setPlayingUrl(null);
        audioRef.current = null;
      });
      audio.addEventListener("error", () => {
        setPlayingUrl(null);
        audioRef.current = null;
      });
    },
    [playingUrl],
  );

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Poll for radio data
  useEffect(() => {
    if (!sessionKey) return;
    let mounted = true;

    const fetchRadio = async () => {
      try {
        const data = await getTeamRadio(sessionKey);
        if (!mounted) return;

        // Mark new entries
        for (const e of data) {
          const key = `${e.date}_${e.driver_number}`;
          seenKeys.current.add(key);
        }

        // Sort newest first
        const sorted = [...data].toSorted(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setEntries(sorted.slice(0, 50));
      } catch {
        // silent
      }
    };

    fetchRadio();
    const interval = setInterval(fetchRadio, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  const handlePlay = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const url = e.currentTarget.dataset.url;
      if (url) playAudio(url);
    },
    [playAudio],
  );

  if (!entries.length) {
    return null;
  }

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-f1-bg3 text-[11px] text-f1-dim uppercase tracking-wider flex items-center gap-2">
        <span>📻 Team Radio</span>
        <span className="text-[10px] text-f1-dim font-normal">({entries.length})</span>
      </div>
      <div className="max-h-[180px] overflow-y-auto">
        {entries.map((entry, i) => {
          const driverName = drivers.get(entry.driver_number) ?? `#${entry.driver_number}`;
          const isPlaying = playingUrl === entry.recording_url;
          const time = formatTime(entry.date);

          return (
            <div
              key={
                `${entry.date}_${entry.driver_number}_${i}` /* eslint-disable-line react/no-array-index-key */
              }
              className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-f1-border last:border-b-0 hover:bg-f1-bg3/30 transition-colors"
            >
              <button
                onClick={handlePlay}
                data-url={entry.recording_url}
                className="w-6 h-6 flex items-center justify-center rounded bg-f1-bg3 hover:bg-f1-blue/30 text-f1-dim hover:text-f1-blue transition-colors shrink-0"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <span className="font-semibold text-f1-bright w-[24px] shrink-0">{driverName}</span>
              <span className="text-f1-dim text-[10px] ml-auto shrink-0">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return "—";
  }
}
