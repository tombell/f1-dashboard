import { useMemo } from "react";

interface DriverInfo {
  broadcast_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
}

interface DriverCellProps {
  driverNumber: number;
  driverMap: Map<number, DriverInfo>;
}

export default function DriverCell({ driverNumber, driverMap }: DriverCellProps) {
  const info = driverMap.get(driverNumber);
  const style = useMemo(
    () => ({ color: info?.team_colour ? `#${info.team_colour}` : undefined }),
    [info?.team_colour],
  );

  if (!info) return <span className="text-xs font-semibold text-f1-bright">#{driverNumber}</span>;
  return (
    <span className="text-xs font-semibold" style={style}>
      {info.broadcast_name}
      <span className="ml-1.5 text-[11px] text-f1-dim font-normal">· {info.team_name}</span>
    </span>
  );
}
