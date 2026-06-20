import { useRef } from "react";

import { getDrivers } from "@/shared/api/openf1";
import type { Driver } from "@/shared/types/api";

interface DriverInfo {
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string;
}

/**
 * Enriches sparse per-session driver data with a meeting-scoped fallback cache.
 * Returns the enriched driver list and a driver map keyed by driver_number.
 */
export function useDriverFallback() {
  const cache = useRef<Map<number, Map<number, DriverInfo>>>(new Map());

  async function enrichDrivers(
    drivers: Driver[],
    meetingKey?: number,
  ): Promise<{ drivers: Driver[]; driverMap: Map<number, DriverInfo> }> {
    const nameMap = new Map<number, DriverInfo>();
    for (const d of drivers) {
      if (!nameMap.has(d.driver_number)) {
        nameMap.set(d.driver_number, {
          name_acronym: d.name_acronym,
          full_name: d.full_name,
          team_name: d.team_name,
          team_colour: d.team_colour,
        });
      }
    }

    // Enrich with meeting-scoped fallback if per-session data is sparse
    if (nameMap.size < 10 && meetingKey) {
      let meetingCache = cache.current.get(meetingKey);
      if (!meetingCache) {
        try {
          const meetingDrivers = await getDrivers(undefined, meetingKey);
          meetingCache = new Map();
          for (const d of meetingDrivers) {
            if (!meetingCache.has(d.driver_number)) {
              meetingCache.set(d.driver_number, {
                name_acronym: d.name_acronym,
                full_name: d.full_name,
                team_name: d.team_name,
                team_colour: d.team_colour,
              });
            }
          }
          cache.current.set(meetingKey, meetingCache);
        } catch {
          // fallback failed
        }
      }
      if (meetingCache) {
        for (const [dn, info] of meetingCache) {
          if (!nameMap.has(dn)) nameMap.set(dn, info);
        }
      }
    }

    // Apply fallback info back onto driver objects
    const enriched = drivers.map((d) => {
      const fb = nameMap.get(d.driver_number);
      if (fb) {
        return {
          ...d,
          broadcast_name: d.broadcast_name || fb.name_acronym,
          full_name: d.full_name || fb.full_name,
          team_name: d.team_name || fb.team_name,
          team_colour: d.team_colour || fb.team_colour,
          name_acronym: d.name_acronym || fb.name_acronym,
        };
      }
      return d;
    });

    return { drivers: enriched, driverMap: nameMap };
  }

  return { enrichDrivers };
}
