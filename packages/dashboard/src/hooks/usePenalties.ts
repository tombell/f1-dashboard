import { useMemo } from "react";

import type { RaceControlMessage } from "@/shared/types/api";

const extractDriver = (entry: any): number | null => {
  if (entry.driver_number) return entry.driver_number;
  const match = (entry.message || "").match(/CAR\s+(\d+)/);
  return match ? parseInt(match[1]) : null;
};

export function usePenalties(rc: RaceControlMessage[]) {
  return useMemo(() => {
    const penalties = new Map<number, string[]>();
    const invCount = new Map<number, number>();
    const penCount = new Map<number, number>();

    if (Array.isArray(rc)) {
      for (const entry of rc) {
        const dn = extractDriver(entry);
        if (!dn) continue;
        const msg = entry.message || "";

        if (msg.includes("UNDER INVESTIGATION")) {
          invCount.set(dn, (invCount.get(dn) || 0) + 1);
        } else if (msg.includes("NO FURTHER ACTION") || msg.includes("NO FURTHER INVESTIGATION")) {
          invCount.set(dn, (invCount.get(dn) || 0) - 1);
        }

        const isPenalty =
          msg.includes("TIME PENALTY") ||
          msg.includes("DRIVE THROUGH PENALTY") ||
          msg.includes("STOP-GO PENALTY");
        if (isPenalty && !msg.includes("SERVED") && !msg.includes("PENALTY SERVED")) {
          penCount.set(dn, (penCount.get(dn) || 0) + 1);
          invCount.set(dn, (invCount.get(dn) || 0) - 1);
        }
        if (msg.includes("PENALTY SERVED")) {
          penCount.set(dn, (penCount.get(dn) || 0) - 1);
        }
      }

      const allDns = new Set([...invCount.keys(), ...penCount.keys()]);
      for (const dn of allDns) {
        const statuses: string[] = [];
        if ((invCount.get(dn) || 0) > 0) statuses.push("INVESTIGATION");
        if ((penCount.get(dn) || 0) > 0) statuses.push("PENALTY");
        if (statuses.length > 0) penalties.set(dn, statuses);
      }
    }

    return penalties;
  }, [rc]);
}
