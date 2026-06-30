import type { Lap } from "@/shared/types/api";

export interface DriverLapSummary {
  driverNumber: number;
  totalLaps: number;
  cleanLaps: number;
  bestLap: number | null;
  averageLap: number | null;
  bestS1: number | null;
  bestS2: number | null;
  bestS3: number | null;
  topSpeed: number | null;
}

export interface LapSummary {
  currentLap: number;
  fastestLapDriver: number | null;
  drivers: Map<number, DriverLapSummary>;
}

interface MutableDriverLapSummary {
  driverNumber: number;
  totalLaps: number;
  cleanLaps: number;
  lapTimeTotal: number;
  bestLap: number;
  bestS1: number;
  bestS2: number;
  bestS3: number;
  topSpeed: number;
}

function emptyDriverSummary(driverNumber: number): MutableDriverLapSummary {
  return {
    driverNumber,
    totalLaps: 0,
    cleanLaps: 0,
    lapTimeTotal: 0,
    bestLap: Infinity,
    bestS1: Infinity,
    bestS2: Infinity,
    bestS3: Infinity,
    topSpeed: 0,
  };
}

function finiteOrNull(value: number): number | null {
  return value === Infinity ? null : value;
}

export function summarizeLaps(laps: Lap[]): LapSummary {
  const summaries = new Map<number, MutableDriverLapSummary>();
  let currentLap = 0;
  let fastestLap = Infinity;
  let fastestLapDriver: number | null = null;

  for (const lap of laps) {
    let summary = summaries.get(lap.driver_number);
    if (!summary) {
      summary = emptyDriverSummary(lap.driver_number);
      summaries.set(lap.driver_number, summary);
    }

    summary.totalLaps++;
    currentLap = Math.max(currentLap, lap.lap_number ?? 0);

    const topSpeed = Math.max(lap.st_speed ?? 0, lap.i1_speed ?? 0, lap.i2_speed ?? 0);
    summary.topSpeed = Math.max(summary.topSpeed, topSpeed);

    if (lap.lap_duration == null || lap.is_pit_out_lap) continue;

    summary.cleanLaps++;
    summary.lapTimeTotal += lap.lap_duration;

    if (lap.lap_duration < summary.bestLap) {
      summary.bestLap = lap.lap_duration;
    }
    if (lap.lap_duration < fastestLap) {
      fastestLap = lap.lap_duration;
      fastestLapDriver = lap.driver_number;
    }
    if (lap.duration_sector_1 != null) {
      summary.bestS1 = Math.min(summary.bestS1, lap.duration_sector_1);
    }
    if (lap.duration_sector_2 != null) {
      summary.bestS2 = Math.min(summary.bestS2, lap.duration_sector_2);
    }
    if (lap.duration_sector_3 != null) {
      summary.bestS3 = Math.min(summary.bestS3, lap.duration_sector_3);
    }
  }

  const drivers = new Map<number, DriverLapSummary>();
  for (const [driverNumber, summary] of summaries) {
    drivers.set(driverNumber, {
      driverNumber,
      totalLaps: summary.totalLaps,
      cleanLaps: summary.cleanLaps,
      bestLap: finiteOrNull(summary.bestLap),
      averageLap: summary.cleanLaps > 0 ? summary.lapTimeTotal / summary.cleanLaps : null,
      bestS1: finiteOrNull(summary.bestS1),
      bestS2: finiteOrNull(summary.bestS2),
      bestS3: finiteOrNull(summary.bestS3),
      topSpeed: summary.topSpeed > 0 ? summary.topSpeed : null,
    });
  }

  return {
    currentLap,
    fastestLapDriver,
    drivers,
  };
}
