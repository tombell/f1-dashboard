// Tyre compound display colours
export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#ff3333",
  MEDIUM: "#ffd600",
  HARD: "#cccccc",
  INTERMEDIATE: "#4caf50",
  WET: "#2196f3",
  SUPERSOFT: "#ff0000",
  ULTRASOFT: "#ff69b4",
  HYPERSOFT: "#ff1493",
};

// Polling intervals (ms)
export const POLL_LIVE = 3_000; // auto-detected session
export const POLL_EXPLICIT = 5_000; // user-specified session

// Stale data timeouts (ms)
export const STALE_RETIRE = 180_000; // 3 min with no data = retired
export const STALE_ACTIVE = 120_000; // 2 min = session still live

// Session type display labels
export const SESSION_TYPE_LABELS: Record<string, string> = {
  Practice: "Practice",
  Qualifying: "Qualifying",
  Race: "Race",
  Sprint: "Sprint",
  SprintQualifying: "Sprint Qualifying",
  SprintShootout: "Sprint Shootout",
  qualifying: "Qualifying",
  race: "Race",
  sprint: "Sprint",
};

// Standard F1 points system
export const POINTS_SYSTEM: Record<number, number> = {
  1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
  6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
};

export function calcPoints(position: number): number {
  return POINTS_SYSTEM[position] ?? 0;
}

export function compoundColor(compound: string): string {
  const norm = compound?.toUpperCase() || "";
  return COMPOUND_COLORS[norm] || "#888";
}

export function countryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏁";
  const offset = 0x1f1e6 - 65;
  return String.fromCodePoint(
    countryCode.charCodeAt(0) + offset,
    countryCode.charCodeAt(1) + offset,
  );
}
