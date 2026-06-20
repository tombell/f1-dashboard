// OpenF1 API types — https://openf1.org/

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_key: number;
  country_code: string;
  country_name: string;
  circuit_key: number;
  circuit_short_name: string;
  date_start: string;
  date_end: string;
  year: number;
  gmt_offset: string;
  is_cancelled?: boolean;
}

export interface Session {
  session_key: number;
  meeting_key: number;
  session_name: string;
  session_type: string;
  session_number?: number;
  date_start: string;
  date_end: string;
  year: number;
  meeting_name?: string;
  circuit_short_name?: string;
  country_code?: string;
  is_cancelled?: boolean;
}

export interface SessionResult {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  position: number | null;
  headshot_url?: string;
  lap_count?: number;
  number_of_laps?: number;
  time?: string;
  duration?: number | number[]; // number for race/practice, [Q1, Q2, Q3] for qualifying
  gap?: string; // gap to leader formatted string
  gap_to_leader?: number;
  interval?: string; // interval to prev driver
  points?: number;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
  classified?: string;
  status?: string;
  grid_position?: number;
  qual_position?: number;
}

export interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  headshot_url?: string;
  session_key: number;
  meeting_key: number;
}

export interface Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  sector_1_time: number | null;
  sector_2_time: number | null;
  sector_3_time: number | null;
  is_pit_out_lap: boolean;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  segments_sector_1: number[] | null;
  segments_sector_2: number[] | null;
  segments_sector_3: number[] | null;
  lap_start_date: string;
  is_pitlap: boolean;
  st_speed: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
}

export interface Position {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  date: string;
}

export interface CarData {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  rpm: number | null;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  drs: number | null;
  gear: number | null;
  n_gear: number | null;
  date: string;
}

export interface Interval {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  gap_to_leader: number | null;
  interval: number | null;
  date: string;
}

export interface PitStop {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  pit_duration: number | null;
  lane_duration: number | null;
  stop_duration: number | null;
  tyre_change?: boolean;
  date: string;
}

export interface Stint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
  tyre_age_at_start: number;
  compound_visual: string;
}

export interface WeatherReading {
  session_key: number;
  meeting_key: number;
  air_temperature: number | null;
  track_temperature: number | null;
  humidity: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  pressure: number | null;
  rainfall: boolean | null;
  date: string;
}

export interface RaceControlMessage {
  session_key: number;
  meeting_key: number;
  driver_number: number | null;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  message: string;
  date: string;
  lap_number: number | null;
}

export interface Location {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  x: number;
  y: number;
  z: number | null;
  date: string;
}

export interface Overtake {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  overtake_count: number;
  date: string;
}

export interface TeamRadioEntry {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  recording_url: string;
}

export interface ChampionshipDriver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  position: number;
  points: number;
  wins: number;
  country_code: string;
  session_key: number;
  meeting_key: number;
}

// Aggregated types for the dashboard

export interface DriverInfo {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  country_code: string;
  headshot_url?: string;
}

export interface PositionData {
  driver_number: number;
  position: number;
  date: string;
}

export interface TimingTowerEntry {
  driver: DriverInfo;
  position: number;
  gap_to_leader: number | null;
  interval: number | null;
  lap_number?: number;
  pit_status?: boolean;
  compound?: string;
  tyre_age?: number;
  last_lap_time?: number | null;
  speed?: number | null;
  sector_times?: (number | null)[];
}
