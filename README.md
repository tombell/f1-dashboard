# F1 Dashboard 🏎️

React + TypeScript + Tailwind CSS frontend for the [OpenF1](https://openf1.org/) API. Two-in-one: a **live timing dashboard** during races and a **historical data browser** for exploring past sessions, results, and championship standings.

Built with React 19, Vite 6, Tailwind v4, and pnpm.

## Features

### Live Dashboard (`/`)
- **Timing Tower** — driver positions with team colours, gaps, intervals (polls every 3s)
- **Weather Bar** — air/track temp, humidity, wind, rainfall
- **Race Control** — live flag notifications and messages
- Countdown to upcoming sessions, live indicator during races

### Historical Browser (`/historical`)
- **Meeting Calendar** — browse all Grands Prix for 2018–2026, filter by status and search
- **Session Results** — practice, qualifying, and race tables
- **Qualifying Per-Segment Fastest** — 🏁 Q1/Q2/Q3 badges highlight the fastest driver in each segment, with orange-bold time cells (also supports Sprint SQ1/SQ2/SQ3)
- **Starting Grid** — grid positions with lap times
- **Championship Standings** — driver standings with "as of" meeting selector
- **Live Data Sections** — lap summaries, pit stops, tyre stints (colour-coded compounds), weather history, position changes, race control log
- **Deep Linking** — all state (year, meeting, session, view) syncs to URL query params

## Prerequisites

- [OpenF1 API](https://github.com/br-g/openf1) running locally on port 8000 (or configure the proxy target in `vite.config.ts`/`server.py`)
- Node.js 22+ and pnpm

## Getting Started

```bash
# Install dependencies
pnpm install

# Development server with API proxy on :5173
pnpm dev

# Production build
pnpm build
```

The dev server proxies `/v1/*` requests to `http://localhost:8000`, so it works out of the box with a local OpenF1 instance.

### All Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server with HMR on :5173 |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Vite preview of production build |
| `pnpm serve` | Static server + API proxy on :8080 |
| `pnpm lint` | Check linting with oxlint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm fmt` | Format all source with oxfmt |
| `pnpm fmt:check` | Check formatting |
| `pnpm check` | Full lint + format + type check |

## Production Deployment

A combined static file server + API proxy (`server.py`) serves the built files on a single port:

```bash
# Build the app
pnpm build

# Start the proxy server (serves dist/ + proxies /v1/* to :8000)
pnpm serve

# Or directly:
python3 server.py 8080
```

This serves everything on a single port — only one SSH tunnel needed:

```bash
ssh -L 8080:localhost:8080 user@host
```

Then open `http://localhost:8080/` for the live dashboard or `http://localhost:8080/historical` for the browser.

## Project Structure

```
src/
├── main.tsx                  # React root, BrowserRouter setup
├── App.tsx                   # Route definitions (/, /historical)
├── index.css                 # Tailwind v4 import + F1 theme variables
├── types/api.ts              # Full OpenF1 API TypeScript interfaces
├── api/openf1.ts             # Typed API client (all endpoints)
├── pages/
│   ├── LiveDashboard.tsx     # Live timing page (polls every 3s)
│   └── HistoricalBrowser.tsx # Historical browser (year picker, tabs, deep links)
└── components/
    ├── Header.tsx            # Nav bar with session info and countdown
    ├── WeatherBar.tsx        # Current weather conditions strip
    ├── TimingTower.tsx       # Driver positions with team-coloured left border
    ├── RaceControl.tsx       # Flag and message feed
    ├── MeetingCalendar.tsx   # Meeting grid with status badges
    ├── MeetingDetail.tsx     # Meeting info card and session list
    ├── SessionResults.tsx    # Practice / Qualifying (per-segment) / Race tables
    ├── StandingsView.tsx     # Championship standings with "as of" selector
    └── LiveDataSections.tsx  # Lap summaries, pits, stints, weather history, positions
```

## API Layer

The `src/api/openf1.ts` client covers every OpenF1 endpoint with typed responses:

| Endpoint | Function | Returns |
|---|---|---|
| `/v1/meetings` | `getMeetings(year?)` | `Meeting[]` |
| `/v1/sessions` | `getSessions(meetingKey?, year?)` | `Session[]` |
| `/v1/session_result` | `getSessionResults(meetingKey, sessionKey?)` | `SessionResult[]` |
| `/v1/starting_grid` | `getStartingGrid(meetingKey, sessionKey?)` | `SessionResult[]` |
| `/v1/drivers` | `getDrivers(sessionKey)` | `Driver[]` |
| `/v1/laps` | `getLaps(sessionKey, driverNumber?)` | `Lap[]` |
| `/v1/position` | `getPositions(sessionKey)` | `Position[]` |
| `/v1/car_data` | `getCarData(sessionKey, driverNumber?)` | `CarData[]` |
| `/v1/intervals` | `getIntervals(sessionKey)` | `Interval[]` |
| `/v1/pit` | `getPitStops(sessionKey)` | `PitStop[]` |
| `/v1/stints` | `getStints(sessionKey)` | `Stint[]` |
| `/v1/weather` | `getWeather(sessionKey)` | `WeatherReading[]` |
| `/v1/race_control` | `getRaceControl(sessionKey)` | `RaceControlMessage[]` |
| `/v1/championship_drivers` | `getChampionshipDrivers(sessionKey?)` | `ChampionshipDriver[]` |
| `/v1/overtakes` | `getOvertakes(sessionKey)` | `Overtake[]` |

All functions accept optional query parameters via `buildQuery()` and return typed arrays.

## Theming

The app uses Tailwind v4's `@theme` directive with F1-specific colours:

```css
@theme {
  --color-f1-bg: #0a0a0f;
  --color-f1-bg2: #12121a;
  --color-f1-bg3: #1a1a28;
  --color-f1-red: #e10600;
  --color-f1-green: #00c853;
  --color-mclaren: #ff8700;
  --color-ferrari: #dc0000;
  --color-mercedes: #00d2be;
  /* ... team colours for all 11 teams */
}
```

## Development

```bash
pnpm dev       # HMR dev server on :5173
pnpm build     # Production build → dist/
pnpm preview   # Preview production build
pnpm lint      # Check linting
pnpm fmt       # Format source files
pnpm check     # TypeScript + lint + format check
```

All tools passed on the current codebase:
- **oxlint** — 96 rules, 0 errors (9 unused-variable warnings, pre-existing)
- **oxfmt** — Prettier-compatible Rust formatter, 16 files pass

## Porting Note

This app replaces a pair of monolithic single-file HTML dashboards (`index.html` and `historical.html` that previously lived at `~/workspace/openf1/dashboard/`). The project now lives independently at `~/workspace/f1-dashboard/`.
