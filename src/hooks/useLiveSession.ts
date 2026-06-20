import { useEffect, useRef, useState } from "react";

import { getLatestSession } from "@/api/openf1";
import { POLL_LIVE, POLL_EXPLICIT } from "@/constants/f1";
import type { Session } from "@/types/api";

interface UseLiveSessionResult {
  session: Session | null;
  error: string | null;
}

export function useLiveSession(sessionKey?: number): UseLiveSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevSession = useRef<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(
      async () => {
        try {
          const sessionRes = sessionKey
            ? await (await fetch(`/v1/sessions?session_key=${sessionKey}`)).json()
            : await getLatestSession();
          const sess = Array.isArray(sessionRes) ? sessionRes[0] : sessionRes;
          if (!sess) return;
          if (!mounted) return;

          // Auto-detected session: only show if it's actually live
          if (!sessionKey) {
            const now = Date.now();
            const start = new Date(sess.date_start).getTime();
            const end = sess.date_end ? new Date(sess.date_end).getTime() : now;
            if (now < start || now > end) {
              if (prevSession.current) {
                setSession(null);
                prevSession.current = null;
              }
              setError(null);
              return;
            }
          }

          prevSession.current = sess;
          setSession(sess);
          setError(null);
        } catch (e: unknown) {
          if (!mounted) return;
          setError(e instanceof Error ? e.message : "Connection error");
        }
      },
      sessionKey ? POLL_EXPLICIT : POLL_LIVE,
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  return { session, error };
}
