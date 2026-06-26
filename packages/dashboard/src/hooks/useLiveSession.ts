import { useEffect, useRef, useState } from "react";

import { getCurrentSession } from "@/shared/api/openf1";
import { POLL_LIVE, POLL_EXPLICIT } from "@/shared/constants/f1";
import type { Session } from "@/shared/types/api";

interface UseLiveSessionResult {
  session: Session | null;
  error: string | null;
}

async function fetchExplicitSession(sessionKey: number): Promise<Session[]> {
  const res = await fetch(`/v1/sessions?session_key=${sessionKey}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export function useLiveSession(sessionKey?: number): UseLiveSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevSession = useRef<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const sessionRes = sessionKey
          ? await fetchExplicitSession(sessionKey)
          : await getCurrentSession();
        const sess = Array.isArray(sessionRes) ? sessionRes[0] : sessionRes;
        if (!mounted) return;

        if (!sess) {
          setSession(null);
          prevSession.current = null;
          setError(sessionKey ? "Session not found" : "No live session available");
          return;
        }

        prevSession.current = sess;
        setSession(sess);
        setError(null);
      } catch (e: unknown) {
        if (!mounted) return;
        setSession(null);
        prevSession.current = null;
        setError(
          !sessionKey && e instanceof Error && e.message.startsWith("API 500")
            ? "No live session available"
            : e instanceof Error
              ? e.message
              : "Connection error",
        );
      }
    };

    fetchSession();
    const interval = setInterval(fetchSession, sessionKey ? POLL_EXPLICIT : POLL_LIVE);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionKey]);

  return { session, error };
}
