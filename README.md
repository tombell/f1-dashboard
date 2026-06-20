# F1 Dashboard

Live timing dashboard and historical browser for Formula 1 sessions. The frontend is now a pnpm monorepo: the live app lives separately from the historical browser, with OpenF1 API access, types, constants, and reusable UI in a shared package.

## Stack

- pnpm workspace
- React 19, Vite 8, Tailwind CSS v4
- TypeScript
- React Router
- OpenF1-compatible API via `/v1/*`
- Python static server and API proxy in `server.py`

## Packages

- `packages/live` — Vite application, live dashboard route, production build output.
- `packages/historical` — historical browser route and historical-only components.
- `packages/shared` — OpenF1 API client, shared API types, F1 constants, header, weather chart, and reusable session data sections.

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

This starts the app at `http://localhost:5173` and proxies `/v1/*` to `http://localhost:8000`.

Useful routes:

- `/` — live timing dashboard
- `/historical` — historical session browser

## Build

```bash
pnpm build
```

The built frontend is written to `packages/live/dist`.

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

The production server proxies API calls through `/v1/*` and team radio audio through `/v1/radio-proxy/*`.

## Checks

Run these before opening a PR or handing off changes:

```bash
pnpm fmt:check
pnpm build
pnpm lint
```

Fix formatting and auto-fixable lint issues with:

```bash
pnpm fmt
pnpm lint:fix
```

## Development Process

1. Put live app work in `packages/live`.
2. Put historical browser work in `packages/historical`.
3. Put reusable API/types/components/constants in `packages/shared`.
4. If API usage changes, update `packages/shared/src/api/openf1.ts` and related types.
5. Run `pnpm build` after TypeScript, package boundary, or routing changes.
6. For deployment changes, verify `pnpm build` and start `pnpm serve` with the expected `OPENF1_API_TARGET`.

## Data Source

The app expects an OpenF1-compatible API. Data availability depends on the upstream API and selected session. Live data may be sparse outside active race weekends, and historical coverage varies by endpoint and year.
