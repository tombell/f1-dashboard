# F1 Dashboard 🏎️

React + TypeScript + Tailwind CSS frontend for the [OpenF1](https://openf1.org/) API. Two-in-one: a **live timing dashboard** during races and a **historical data browser** for exploring past sessions, results, and championship standings.

Built with React 19, Vite 6, Tailwind v4, and pnpm.

## Features

### Live Dashboard (`/`)
- **Timing Tower** — driver positions with team colours, gaps, intervals (polls every 3s)
- **Track Clock** — session elapsed time in track timezone, live indicator during races
- **Weather Bar** — air/track temp, humidity, wind, pressure, rainfall
- **Race Control** — live flag notifications and messages
- **Team Radio** — play driver team radio audio clips
- **Live Data Sections** — expandable panels for lap times, pit stops, tyre stints (colour-coded compounds), weather history chart, and position changes

### Historical Browser (`/historical`)
- **Meeting Calendar** — browse all Grands Prix for 2018–2026, filter by status and search
- **Session Results** — practice, qualifying, and race tables
- **Qualifying Per-Segment Fastest** — 🏁 Q1/Q2/Q3 badges highlight the fastest driver in each segment, with orange-bold time cells (also supports Sprint SQ1/SQ2/SQ3)
- **Starting Grid** — grid positions with lap times
- **Championship Standings** — driver standings with "as of" meeting selector
- **Session Data Sections** — lap summaries, pit stops, tyre stints (colour-coded compounds), weather history, position changes, race control log
- **Team Radio** — browse and play historical team radio clips
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

## API Layer

The `src/api/openf1.ts` client covers every OpenF1 endpoint used by the app, with typed responses:

| Endpoint | Function | Returns |
|---|---|---|
| `/v1/meetings` | `getMeetings(year?)` | `Meeting[]` |
| `/v1/sessions` | `getSessions(meetingKey?, year?)` | `Session[]` |
| `/v1/sessions?session_key=latest` | `getLatestSession()` | `Session` |
| `/v1/session_result` | `getSessionResults(meetingKey, sessionKey?)` | `SessionResult[]` |
| `/v1/starting_grid` | `getStartingGrid(meetingKey, sessionKey?)` | `SessionResult[]` |
| `/v1/drivers` | `getDrivers(sessionKey?, meetingKey?)` | `Driver[]` |
| `/v1/laps` | `getLaps(sessionKey, driverNumber?)` | `Lap[]` |
| `/v1/position` | `getPositions(sessionKey)` | `Position[]` |
| `/v1/intervals` | `getIntervals(sessionKey)` | `Interval[]` |
| `/v1/pit` | `getPitStops(sessionKey)` | `PitStop[]` |
| `/v1/stints` | `getStints(sessionKey)` | `Stint[]` |
| `/v1/weather` | `getWeather(sessionKey)` | `WeatherReading[]` |
| `/v1/race_control` | `getRaceControl(sessionKey)` | `RaceControlMessage[]` |
| `/v1/team_radio` | `getTeamRadio(sessionKey)` | `TeamRadioEntry[]` |

All functions accept optional query parameters via `buildQuery()` and return typed arrays.
