# F1 Dashboard

Live timing dashboard and historical browser for Formula 1 sessions. The frontend is a pnpm monorepo with two independent Vite web apps: one for live timing and one for historical browsing. Shared OpenF1 API access, types, constants, and reusable UI live in a shared package.

## Stack

- pnpm workspace
- React 19, Vite 8, Tailwind CSS v4
- TypeScript
- React Router
- OpenF1-compatible API via `/v1/*`
- Python static server and API proxy in `server.py`

## Packages

- `packages/live` — standalone live timing web app.
- `packages/historical` — standalone historical browser web app.
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

Run the live app:

```bash
pnpm dev:live
```

Run the historical app:

```bash
pnpm dev:historical
```

Run both apps at once:

```bash
pnpm dev:all
```

Default development ports:

- Live: `http://localhost:5173`
- Historical: `http://localhost:5174`

Both Vite dev servers proxy `/v1/*` to `http://localhost:8000`.

## Build

Build both web apps:

```bash
pnpm build
```

Build one app:

```bash
pnpm build:live
pnpm build:historical
```

Build output paths:

- Live: `packages/live/dist`
- Historical: `packages/historical/dist`

## Preview

```bash
pnpm preview:live
pnpm preview:historical
```

## Run Built Output

Build first, make sure the OpenF1 API is running, then start the static server and API proxy for the app you want:

```bash
pnpm build:live
pnpm serve:live
```

```bash
pnpm build:historical
pnpm serve:historical
```

The default server port is `8080`. Pass an app name and port directly when needed:

```bash
python3 server.py live 8080
python3 server.py historical 8081
```

Set `OPENF1_API_TARGET` to change the upstream API target:

```bash
OPENF1_API_TARGET=http://localhost:8000 pnpm serve:live
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
6. For deployment changes, verify the relevant app build and server command with the expected `OPENF1_API_TARGET`.

## Data Source

The apps expect an OpenF1-compatible API. Data availability depends on the upstream API and selected session. Live data may be sparse outside active race weekends, and historical coverage varies by endpoint and year.
