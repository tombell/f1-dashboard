import type { WeatherReading } from "@/shared/types/api";

interface WeatherChartProps {
  data: WeatherReading[];
}

interface Tick {
  y: number;
  label: string;
}

interface RainBand {
  x1: number;
  x2: number;
}

interface TimeLabel {
  x: number;
  label: string;
}

interface WindDot {
  x: number;
  y: number;
  speed: number;
}

interface WeatherChartModel {
  airPoints: string;
  trackPoints: string;
  humidityLinePoints: string;
  humidityPolyPoints: string;
  windDots: WindDot[];
  tempTicks: Tick[];
  humTicks: Tick[];
  timeLabels: TimeLabel[];
  gridYPositions: number[];
  rainBands: RainBand[];
}

const W = 800;
const H = 280;
const ML = 48;
const MR = 48;
const MT = 20;
const MB = 32;
const CW = W - ML - MR;
const CH = H - MT - MB;

export default function WeatherChart({ data }: WeatherChartProps) {
  const model = buildWeatherChartModel(data);
  if (!model) return null;

  return (
    <div className="w-full py-2">
      <WeatherSvg model={model} />
      <WeatherLegend showWind={model.windDots.length > 0} />
    </div>
  );
}

function buildWeatherChartModel(data: WeatherReading[]): WeatherChartModel | null {
  if (data.length < 2) return null;

  const sorted = [...data]
    .filter((d) => d.date && (d.air_temperature != null || d.track_temperature != null))
    .toSorted((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) return null;

  const t0 = new Date(sorted[0].date).getTime();
  const tEnd = new Date(sorted[sorted.length - 1].date).getTime();
  const timeRange = tEnd - t0 || 1;
  const { minTemp, maxTemp, maxWind } = getRanges(sorted);
  const tempRange = maxTemp - minTemp || 1;
  const xPos = (t: number) => ML + ((t - t0) / timeRange) * CW;
  const yTemp = (v: number) => MT + CH - ((v - minTemp) / tempRange) * CH;
  const yHum = (v: number) => MT + CH - (v / 100) * CH;
  const yWind = (v: number) => MT + CH - (v / maxWind) * CH;
  const tempTicks = buildTempTicks(minTemp, maxTemp, tempRange, yTemp);
  const humTicks = buildHumTicks(yHum);

  return {
    airPoints: buildLinePoints(sorted, "air_temperature", xPos, yTemp),
    trackPoints: buildLinePoints(sorted, "track_temperature", xPos, yTemp),
    humidityLinePoints: buildLinePoints(sorted, "humidity", xPos, yHum),
    humidityPolyPoints: buildHumidityPolyPoints(sorted, xPos, yHum),
    windDots: buildWindDots(sorted, xPos, yWind),
    tempTicks,
    humTicks,
    timeLabels: buildTimeLabels(sorted, xPos),
    gridYPositions: uniqueRoundedY([...tempTicks, ...humTicks]),
    rainBands: buildRainBands(sorted, tEnd, xPos),
  };
}

function getRanges(sorted: WeatherReading[]) {
  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let maxWind = 0;

  for (const d of sorted) {
    if (d.air_temperature != null) {
      minTemp = Math.min(minTemp, d.air_temperature);
      maxTemp = Math.max(maxTemp, d.air_temperature);
    }
    if (d.track_temperature != null) {
      minTemp = Math.min(minTemp, d.track_temperature);
      maxTemp = Math.max(maxTemp, d.track_temperature);
    }
    if (d.wind_speed != null) maxWind = Math.max(maxWind, d.wind_speed);
  }

  return {
    minTemp: Math.floor(minTemp - 2),
    maxTemp: Math.ceil(maxTemp + 2),
    maxWind: Math.max(maxWind, 1),
  };
}

function buildLinePoints(
  sorted: WeatherReading[],
  key: "air_temperature" | "track_temperature" | "humidity",
  xPos: (t: number) => number,
  yPos: (value: number) => number,
) {
  const points: string[] = [];
  for (const d of sorted) {
    const value = d[key];
    if (value == null) continue;
    points.push(`${xPos(new Date(d.date).getTime())},${yPos(value)}`);
  }
  return points.join(" ");
}

function buildHumidityPolyPoints(
  sorted: WeatherReading[],
  xPos: (t: number) => number,
  yHum: (value: number) => number,
) {
  const pts = buildLinePoints(sorted, "humidity", xPos, yHum).split(" ").filter(Boolean);
  if (pts.length === 0) return "";
  const lastX = pts[pts.length - 1].split(",")[0];
  const firstX = pts[0].split(",")[0];
  return `${firstX},${H - MB} ${pts.join(" ")} ${lastX},${H - MB}`;
}

function buildWindDots(
  sorted: WeatherReading[],
  xPos: (t: number) => number,
  yWind: (value: number) => number,
) {
  const dots: WindDot[] = [];
  for (const d of sorted) {
    if (d.wind_speed == null) continue;
    const t = new Date(d.date).getTime();
    dots.push({ x: xPos(t), y: yWind(d.wind_speed), speed: d.wind_speed });
  }
  return dots;
}

function buildTempTicks(
  minTemp: number,
  maxTemp: number,
  tempRange: number,
  yTemp: (value: number) => number,
) {
  const tempStep = Math.max(1, Math.pow(10, Math.floor(Math.log10(tempRange))));
  const niceTempStep = tempRange / tempStep > 5 ? tempStep : tempStep / 2;
  const tempTicks: Tick[] = [];
  const firstTick = Math.ceil(minTemp / niceTempStep) * niceTempStep;
  for (let v = firstTick; v <= maxTemp; v += niceTempStep) {
    tempTicks.push({ y: yTemp(v), label: `${Math.round(v)}°` });
  }
  return tempTicks;
}

function buildHumTicks(yHum: (value: number) => number) {
  const humTicks: Tick[] = [];
  for (let v = 0; v <= 100; v += 25) {
    humTicks.push({ y: yHum(v), label: `${v}%` });
  }
  return humTicks;
}

function buildTimeLabels(sorted: WeatherReading[], xPos: (t: number) => number) {
  const timeLabels: TimeLabel[] = [];
  const labelCount = Math.min(8, sorted.length);
  const step = Math.max(1, Math.floor(sorted.length / labelCount));

  for (let i = 0; i < sorted.length; i += step) {
    const d = new Date(sorted[i].date);
    timeLabels.push({
      x: xPos(d.getTime()),
      label: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  const lastD = new Date(sorted[sorted.length - 1].date);
  timeLabels.push({
    x: xPos(lastD.getTime()),
    label: lastD.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  });
  return timeLabels;
}

function buildRainBands(sorted: WeatherReading[], tEnd: number, xPos: (t: number) => number) {
  const rainBands: RainBand[] = [];
  let rainStart: number | null = null;

  for (const d of sorted) {
    const t = new Date(d.date).getTime();
    if (d.rainfall) {
      if (rainStart === null) rainStart = t;
    } else if (rainStart !== null) {
      rainBands.push({ x1: xPos(rainStart), x2: xPos(t) });
      rainStart = null;
    }
  }

  if (rainStart !== null) {
    rainBands.push({ x1: xPos(rainStart), x2: xPos(tEnd) });
  }
  return rainBands;
}

function uniqueRoundedY(ticks: Tick[]) {
  const positions = new Set<number>();
  for (const tick of ticks) {
    positions.add(Math.round(tick.y));
  }
  return [...positions];
}

function WeatherSvg({ model }: { model: WeatherChartModel }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[280px] w-full">
      <GridLines yPositions={model.gridYPositions} />
      <RainBands bands={model.rainBands} />
      {model.humidityPolyPoints && (
        <polygon points={model.humidityPolyPoints} fill="#4caf50" opacity={0.04} />
      )}
      <polyline
        points={model.humidityLinePoints}
        fill="none"
        stroke="#4caf50"
        strokeWidth={1}
        strokeDasharray="3,3"
        opacity={0.3}
      />
      <polyline
        points={model.trackPoints}
        fill="none"
        stroke="#ef5350"
        strokeWidth={2}
        opacity={0.8}
      />
      <polyline points={model.airPoints} fill="none" stroke="#64b5f6" strokeWidth={2} />
      <WindLayer dots={model.windDots} />
      <Axes tempTicks={model.tempTicks} humTicks={model.humTicks} />
      <TimeLabels labels={model.timeLabels} />
    </svg>
  );
}

function GridLines({ yPositions }: { yPositions: number[] }) {
  return (
    <>
      {yPositions.map((y) => (
        <line key={y} x1={ML} y1={y} x2={W - MR} y2={y} stroke="#2a2a2a" strokeWidth={1} />
      ))}
    </>
  );
}

function RainBands({ bands }: { bands: RainBand[] }) {
  return (
    <>
      {bands.map((b) => (
        <rect
          key={`${b.x1}-${b.x2}`}
          x={b.x1}
          y={MT}
          width={Math.max(2, b.x2 - b.x1)}
          height={CH}
          fill="#2196f3"
          opacity={0.08}
        />
      ))}
    </>
  );
}

function WindLayer({ dots }: { dots: WindDot[] }) {
  return (
    <>
      {dots.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r={1.5} fill="#aaa" opacity={0.6} />
      ))}
      <polyline
        points={dots.map((d) => `${d.x},${d.y}`).join(" ")}
        fill="none"
        stroke="#aaa"
        strokeWidth={0.8}
        opacity={0.4}
      />
    </>
  );
}

function Axes({ tempTicks, humTicks }: { tempTicks: Tick[]; humTicks: Tick[] }) {
  return (
    <>
      <line x1={ML} y1={MT} x2={ML} y2={H - MB} stroke="#444" strokeWidth={1} />
      <line x1={ML} y1={H - MB} x2={W - MR} y2={H - MB} stroke="#444" strokeWidth={1} />
      <line x1={W - MR} y1={MT} x2={W - MR} y2={H - MB} stroke="#444" strokeWidth={1} />
      {tempTicks.map((t) => (
        <text
          key={t.label}
          x={ML - 6}
          y={t.y + 3}
          textAnchor="end"
          fill="#888"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          {t.label}
        </text>
      ))}
      <text
        x={12}
        y={MT + CH / 2 + 4}
        textAnchor="middle"
        fill="#666"
        fontSize={9}
        transform={`rotate(-90, 12, ${MT + CH / 2})`}
      >
        Temp
      </text>
      {humTicks.map((t) => (
        <text
          key={t.label}
          x={W - MR + 6}
          y={t.y + 3}
          textAnchor="start"
          fill="#888"
          fontSize={10}
          fontFamily="ui-monospace, monospace"
        >
          {t.label}
        </text>
      ))}
      <text
        x={W - 12}
        y={MT + CH / 2 + 4}
        textAnchor="middle"
        fill="#666"
        fontSize={9}
        transform={`rotate(90, ${W - 12}, ${MT + CH / 2})`}
      >
        Humidity
      </text>
    </>
  );
}

function TimeLabels({ labels }: { labels: TimeLabel[] }) {
  return (
    <>
      {labels.map((t) => (
        <text
          key={t.x}
          x={t.x}
          y={H - 8}
          textAnchor="middle"
          fill="#666"
          fontSize={9}
          fontFamily="ui-monospace, monospace"
        >
          {t.label}
        </text>
      ))}
    </>
  );
}

function WeatherLegend({ showWind }: { showWind: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-f1-dim">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5 bg-[#64b5f6]" />
        Air
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5 bg-[#ef5350] opacity-80" />
        Track
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-0 w-5 border-t border-dashed border-[#4caf50] opacity-40" />
        Humidity
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-5 rounded-sm bg-[#2196f3] opacity-20" />
        Rain
      </span>
      {showWind && (
        <span className="inline-flex items-center gap-1.5">
          <span className="relative inline-block h-2 w-5">
            <span className="absolute left-0 right-0 top-1/2 border-t border-[#aaa] opacity-40" />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#aaa] opacity-60" />
          </span>
          Wind
        </span>
      )}
    </div>
  );
}
