# F1 Dashboard

Live timing dashboard and historical browser for Formula 1 sessions. The app reads from an OpenF1-compatible API, proxies those requests during development and production, and renders live timing, session data, standings, weather, race control, and team radio in a React frontend.

## Stack

- React 19, Vite 6, and Tailwind CSS v4
- TypeScript
- React Router
- OpenF1 API data via `/v1/*`
- Python static server and API proxy in `server.py`
- pnpm

## Prerequisites

- Node.js 22 or newer
- pnpm
- OpenF1 API available at `http://localhost:8000`, or set `OPENF1_API_TARGET` for the production proxy

## Install

```bash
pnpm install
```

## Development

Start the OpenF1 API first, then run the Vite development server:

```bash
pnpm dev
```

This starts the app at `http://localhost:5173`.

The Vite dev server proxies `/v1/*` to `http://localhost:8000`.

Useful routes while developing:

| Route | Description |
| --- | --- |
| `/` | Live timing dashboard |
| `/historical` | Historical session browser |

Useful OpenF1 endpoints used by the app:

| Endpoint | Description |
| --- | --- |
| `GET /v1/meetings` | Meeting calendar |
| `GET /v1/sessions` | Sessions for a meeting or year |
| `GET /v1/sessions?session_key=latest` | Latest session |
| `GET /v1/session_result` | Session results |
| `GET /v1/starting_grid` | Starting grid |
| `GET /v1/drivers` | Driver metadata |
| `GET /v1/laps` | Lap data |
| `GET /v1/position` | Position history |
| `GET /v1/intervals` | Timing gaps and intervals |
| `GET /v1/pit` | Pit stops |
| `GET /v1/stints` | Tyre stints |
| `GET /v1/weather` | Weather readings |
| `GET /v1/race_control` | Race control messages |
| `GET /v1/team_radio` | Team radio metadata |

## Build

Build the production app:

```bash
pnpm build
```

The built frontend is written to `dist`.

Preview the built output with Vite:

```bash
pnpm preview
```

## Run Built Output

Build first, make sure the OpenF1 API is running, then start the combined static server and API proxy:

```bash
pnpm build
pnpm serve
```

Open `http://localhost:8080` for the live dashboard or `http://localhost:8080/historical` for the historical browser.

Set `OPENF1_API_TARGET` to change the upstream API target:

```bash
OPENF1_API_TARGET=http://localhost:8000 pnpm serve
```

Pass a port to `server.py` directly when you need a non-default port:

```bash
python3 server.py 8081
```

The production server also proxies team radio audio through `/v1/radio-proxy/*`.

## Checks

Run these before opening a PR or handing off changes:

```bash
pnpm build
pnpm lint
pnpm fmt:check
```

Fix formatting and auto-fixable lint issues with:

```bash
pnpm fmt
pnpm lint:fix
```

## Development Process

1. Keep UI changes scoped to `src`.
2. Use `pnpm dev` for app work against a local OpenF1 API.
3. If API usage changes, update `src/api/openf1.ts` and keep the endpoint list documented here.
4. Run `pnpm build` after TypeScript or routing changes.
5. Run `pnpm lint` and `pnpm fmt:check` before committing.
6. For deployment changes, verify `pnpm build` and start `pnpm serve` with the expected `OPENF1_API_TARGET`.

## Data Source

The app expects an OpenF1-compatible API. OpenF1 provides Formula 1 timing, sessions, drivers, laps, position, weather, race control, and team radio metadata through `/v1/*` endpoints.

Data availability depends on the upstream API and the selected session. Live data may be sparse outside active race weekends, and historical coverage varies by endpoint and year.
