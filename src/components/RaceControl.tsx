import { useEffect, useState } from "react";

import { getRaceControl } from "@/api/openf1";
import type { RaceControlMessage } from "@/types/api";

interface RaceControlProps {
  sessionKey: number | undefined;
}

const FLAG_EMOJIS: Record<string, string> = {
  GREEN: "🟢",
  YELLOW: "🟡",
  RED: "🔴",
  BLUE: "🔵",
  CHEQUERED: "🏁",
  SC: "🚙",
  VSC: "🚥",
  WHITE: "⚪",
  BLACK: "⚫",
  BLACK_WHITE: "🏳️",
  ORANGE: "🟠",
};

function flagEmoji(flag: string | null): string {
  if (!flag) return "";
  return FLAG_EMOJIS[flag.toUpperCase()] || "🚩";
}

export default function RaceControl({ sessionKey }: RaceControlProps) {
  const [messages, setMessages] = useState<RaceControlMessage[]>([]);

  useEffect(() => {
    if (!sessionKey) return;
    let mounted = true;

    const fetchMessages = async () => {
      try {
        const data = await getRaceControl(sessionKey);
        if (!mounted) return;
        setMessages(data.slice(-100).reverse()); // cap at 100, newest first
      } catch {
        // silent
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  if (!sessionKey) {
    return (
      <div className="bg-f1-bg2 border border-f1-border rounded-lg flex items-center justify-center text-f1-dim text-sm">
        No active session
      </div>
    );
  }

  return (
    <div className="bg-f1-bg2 border border-f1-border rounded-lg flex flex-col overflow-hidden">
      <div className="px-4 py-2 bg-f1-bg3 text-xs font-semibold text-f1-dim uppercase tracking-wider">
        Race Control
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {messages.length === 0 && (
          <div className="text-f1-dim text-xs text-center py-8">No race control messages yet</div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className="flex gap-2 text-xs border-b border-f1-border/50 pb-1.5 last:border-b-0"
          >
            <span className="text-f1-dim shrink-0 text-[11px]">
              {new Date(msg.date).toLocaleTimeString()}
            </span>
            {msg.flag && <span className="text-base leading-none">{flagEmoji(msg.flag)}</span>}
            <span className="text-f1-text">{msg.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
