const API_BASE = "/v1";

const LIVE_SESSION_START_GRACE_MS = 30 * 60 * 1000;
const LIVE_SESSION_END_GRACE_MS = 30 * 60 * 1000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// Meetings
export async function getMeetings(year?: number) {
  const q = buildQuery({ year });
  return fetchJson<import("@/shared/types/api").Meeting[]>(`/meetings${q}`);
}

// Sessions
export async function getSessions(meetingKey?: number, year?: number) {
  const q = buildQuery({ meeting_key: meetingKey, year });
  return fetchJson<import("@/shared/types/api").Session[]>(`/sessions${q}`);
}

export async function getLatestSession() {
  const results = await fetchJson<import("@/shared/types/api").Session[]>(
    "/sessions?session_key=latest",
  );
  return results[0] || null;
}

function sessionLiveWindowScore(
  session: import("@/shared/types/api").Session,
  nowMs: number,
): number | null {
  if (session.is_cancelled) return null;

  const start = new Date(session.date_start).getTime();
  if (!Number.isFinite(start)) return null;

  const end = session.date_end ? new Date(session.date_end).getTime() : start;
  const safeEnd = Number.isFinite(end) ? end : start;

  if (nowMs < start - LIVE_SESSION_START_GRACE_MS || nowMs > safeEnd + LIVE_SESSION_END_GRACE_MS) {
    return null;
  }

  if (nowMs >= start && nowMs <= safeEnd) return 0;
  return Math.min(Math.abs(nowMs - start), Math.abs(nowMs - safeEnd));
}

export async function getCurrentSession() {
  const latest = await getLatestSession();
  const nowMs = Date.now();

  if (latest && sessionLiveWindowScore(latest, nowMs) !== null) {
    return latest;
  }

  const year = latest?.year ?? new Date(nowMs).getUTCFullYear();
  const sessions = await getSessions(undefined, year);
  const candidates = sessions
    .map((session) => ({ session, score: sessionLiveWindowScore(session, nowMs) }))
    .filter(
      (entry): entry is { session: import("@/shared/types/api").Session; score: number } =>
        entry.score !== null,
    )
    .toSorted(
      (a, b) => a.score - b.score || a.session.date_start.localeCompare(b.session.date_start),
    );

  return candidates[0]?.session ?? null;
}

// Session Results
export async function getSessionResults(meetingKey: number, sessionKey?: number) {
  const q = buildQuery({ meeting_key: meetingKey, session_key: sessionKey });
  return fetchJson<import("@/shared/types/api").SessionResult[]>(`/session_result${q}`);
}

// Starting Grid
export async function getStartingGrid(meetingKey: number, sessionKey?: number) {
  const q = buildQuery({ meeting_key: meetingKey, session_key: sessionKey });
  return fetchJson<import("@/shared/types/api").SessionResult[]>(`/starting_grid${q}`);
}

// Drivers
export async function getDrivers(sessionKey?: number, meetingKey?: number) {
  const q = buildQuery({ session_key: sessionKey, meeting_key: meetingKey });
  return fetchJson<import("@/shared/types/api").Driver[]>(`/drivers${q}`);
}

// Laps
export async function getLaps(sessionKey: number, driverNumber?: number) {
  const q = buildQuery({ session_key: sessionKey, driver_number: driverNumber });
  return fetchJson<import("@/shared/types/api").Lap[]>(`/laps${q}`);
}

// Position
export async function getPositions(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").Position[]>(`/position?session_key=${sessionKey}`);
}

// Intervals
export async function getIntervals(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").Interval[]>(`/intervals?session_key=${sessionKey}`);
}

// Pit Stops
export async function getPitStops(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").PitStop[]>(`/pit?session_key=${sessionKey}`);
}

// Stints
export async function getStints(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").Stint[]>(`/stints?session_key=${sessionKey}`);
}

// Weather
export async function getWeather(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").WeatherReading[]>(
    `/weather?session_key=${sessionKey}`,
  );
}

// Race Control
export async function getRaceControl(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").RaceControlMessage[]>(
    `/race_control?session_key=${sessionKey}`,
  );
}

// Location
export async function getLocation(sessionKey: number, driverNumber?: number) {
  const q = buildQuery({ session_key: sessionKey, driver_number: driverNumber });
  return fetchJson<import("@/shared/types/api").Location[]>(`/location${q}`);
}

// Team Radio
export async function getTeamRadio(sessionKey: number) {
  return fetchJson<import("@/shared/types/api").TeamRadioEntry[]>(
    `/team_radio?session_key=${sessionKey}`,
  );
}
