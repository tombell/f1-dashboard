const API_BASE = "/v1";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

// Meetings
export async function getMeetings(year?: number) {
  const q = buildQuery({ year });
  return fetchJson<import("../types/api").Meeting[]>(`/meetings${q}`);
}

export async function getMeeting(meetingKey: number) {
  const q = buildQuery({ meeting_key: meetingKey });
  const results = await fetchJson<import("../types/api").Meeting[]>(`/meetings${q}`);
  return results[0] || null;
}

// Sessions
export async function getSessions(meetingKey?: number, year?: number) {
  const q = buildQuery({ meeting_key: meetingKey, year });
  return fetchJson<import("../types/api").Session[]>(`/sessions${q}`);
}

export async function getSession(sessionKey: number) {
  const results = await fetchJson<import("../types/api").Session[]>(
    `/sessions?session_key=${sessionKey}`,
  );
  return results[0] || null;
}

export async function getLatestSession() {
  const results = await fetchJson<import("../types/api").Session[]>("/sessions?session_key=latest");
  return results[0] || null;
}

// Session Results
export async function getSessionResults(meetingKey: number, sessionKey?: number) {
  const q = buildQuery({ meeting_key: meetingKey, session_key: sessionKey });
  return fetchJson<import("../types/api").SessionResult[]>(`/session_result${q}`);
}

// Starting Grid
export async function getStartingGrid(meetingKey: number, sessionKey?: number) {
  const q = buildQuery({ meeting_key: meetingKey, session_key: sessionKey });
  return fetchJson<import("../types/api").SessionResult[]>(`/starting_grid${q}`);
}

// Drivers
export async function getDrivers(sessionKey?: number) {
  const q = buildQuery({ session_key: sessionKey });
  return fetchJson<import("../types/api").Driver[]>(`/drivers${q}`);
}

// Laps
export async function getLaps(sessionKey: number, driverNumber?: number) {
  const q = buildQuery({ session_key: sessionKey, driver_number: driverNumber });
  return fetchJson<import("../types/api").Lap[]>(`/laps${q}`);
}

// Position
export async function getPositions(sessionKey: number) {
  return fetchJson<import("../types/api").Position[]>(`/position?session_key=${sessionKey}`);
}

// Intervals
export async function getIntervals(sessionKey: number) {
  return fetchJson<import("../types/api").Interval[]>(`/intervals?session_key=${sessionKey}`);
}

// Car Data
export async function getCarData(sessionKey: number, driverNumber?: number) {
  const q = buildQuery({ session_key: sessionKey, driver_number: driverNumber });
  return fetchJson<import("../types/api").CarData[]>(`/car_data${q}`);
}

// Pit Stops
export async function getPitStops(sessionKey: number) {
  return fetchJson<import("../types/api").PitStop[]>(`/pit?session_key=${sessionKey}`);
}

// Stints
export async function getStints(sessionKey: number) {
  return fetchJson<import("../types/api").Stint[]>(`/stints?session_key=${sessionKey}`);
}

// Weather
export async function getWeather(sessionKey: number) {
  return fetchJson<import("../types/api").WeatherReading[]>(`/weather?session_key=${sessionKey}`);
}

// Race Control
export async function getRaceControl(sessionKey: number) {
  return fetchJson<import("../types/api").RaceControlMessage[]>(
    `/race_control?session_key=${sessionKey}`,
  );
}

// Championship Drivers
export async function getChampionshipDrivers(sessionKey?: number) {
  const q = buildQuery({ session_key: sessionKey });
  return fetchJson<import("../types/api").ChampionshipDriver[]>(`/championship_drivers${q}`);
}

// Location
export async function getLocation(sessionKey: number) {
  return fetchJson<unknown[]>(`/location?session_key=${sessionKey}`);
}

// Team Radio
export async function getTeamRadio(sessionKey: number) {
  return fetchJson<import("../types/api").TeamRadioEntry[]>(`/team_radio?session_key=${sessionKey}`);
}

// Overtakes
export async function getOvertakes(sessionKey: number) {
  return fetchJson<import("../types/api").Overtake[]>(`/overtakes?session_key=${sessionKey}`);
}
