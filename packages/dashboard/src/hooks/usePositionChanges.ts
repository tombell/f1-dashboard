import { useCallback, useRef, useState } from "react";

import type { Position } from "@/shared/types/api";

const CHANGE_CLEAR_MS = 4_000;

export function usePositionChanges() {
  const prevPositions = useRef<Map<number, number> | null>(null);
  const [positionChanges, setPositionChanges] = useState<Map<number, "up" | "down">>(new Map());

  const detectChanges = useCallback((positions: Position[]) => {
    const newPosMap = new Map<number, number>();
    for (const pos of positions) {
      newPosMap.set(pos.driver_number, pos.position);
    }

    if (prevPositions.current && prevPositions.current.size > 0) {
      const changes = new Map<number, "up" | "down">();
      for (const [dn, newPos] of newPosMap) {
        const oldPos = prevPositions.current.get(dn);
        if (oldPos !== undefined && oldPos !== newPos) {
          changes.set(dn, newPos < oldPos ? "up" : "down");
        }
      }
      if (changes.size > 0) {
        setPositionChanges(changes);
        setTimeout(() => setPositionChanges(new Map()), CHANGE_CLEAR_MS);
      }
    }
    prevPositions.current = newPosMap;
  }, []);

  return { positionChanges, detectChanges };
}
