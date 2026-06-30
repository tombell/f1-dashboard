import { useMemo } from "react";

import type { RaceControlMessage } from "@/shared/types/api";

const CAR_MESSAGE_RE = /CAR\s+(\d+)/;
const UNDER_INVESTIGATION_RE = /UNDER INVESTIGATION/;
const NO_FURTHER_ACTION_RE = /NO FURTHER ACTION|NO FURTHER INVESTIGATION/;
const PENALTY_RE = /TIME PENALTY|DRIVE THROUGH PENALTY|STOP-GO PENALTY/;
const PENALTY_SERVED_RE = /PENALTY SERVED/;
const SERVED_RE = /SERVED/;

const extractDriver = (entry: RaceControlMessage): number | null => {
  if (entry.driver_number) return entry.driver_number;
  const match = CAR_MESSAGE_RE.exec(entry.message || "");
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

        if (UNDER_INVESTIGATION_RE.test(msg)) {
          invCount.set(dn, (invCount.get(dn) || 0) + 1);
        } else if (NO_FURTHER_ACTION_RE.test(msg)) {
          invCount.set(dn, (invCount.get(dn) || 0) - 1);
        }

        const isPenalty = PENALTY_RE.test(msg);
        if (isPenalty && !SERVED_RE.test(msg) && !PENALTY_SERVED_RE.test(msg)) {
          penCount.set(dn, (penCount.get(dn) || 0) + 1);
          invCount.set(dn, (invCount.get(dn) || 0) - 1);
        }
        if (PENALTY_SERVED_RE.test(msg)) {
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
