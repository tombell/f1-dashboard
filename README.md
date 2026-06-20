# F1 Dashboard

Live timing dashboard and historical browser for Formula 1 sessions. The repo is a pnpm monorepo with a Fastify app server, two independent Vite web apps, and shared frontend code.

## Stack

- pnpm workspace
- Fastify app server in `packages/app`
- React 19, Vite 8, Tailwind CSS v4
- TypeScript
- React Router
- OpenF1-compatible API proxied through `/v1/*`

## Packages

- `packages/app` — Fastify server named `@f1-dashboard/app`; serves built dashboards and proxies OpenF1.
- `packages/live` — standalone live timing web app, served at `/` by the app server.
- `packages/historical` — standalone historical browser web app, served at `/historical` by the app server.
- `packages/shared` — OpenF1 API client, shared API types, F1 constants, header, weather chart, and reusable session data sections.

## Prerequisites

- Node.js 22 or newer
- pnpm
- OpenF1 API available at `http://localhost:8000`, or set `OPENF1_API_TARGET`

## Install

```bash
pnpm install
```

## Development

Run the Fastify app server:

```bash
pnpm dev:app
```

Run the live app Vite dev server:

```bash
pnpm dev:live
```

Run the historical app Vite dev server:

```bash
pnpm dev:historical
```

Run all dev servers at once:

```bash
pnpm dev:all
```

Default development URLs:

- App server: `http://localhost:8080`
- Live Vite app: `http://localhost:5173/`
- Historical Vite app: `http://localhost:5174/historical/`

Both Vite dev servers proxy `/v1/*` to `http://localhost:8000`.

## Build

Build the live app, historical app, and Fastify app server:

```bash
pnpm build
```

Build one package:

```bash
pnpm build:live
pnpm build:historical
pnpm build:app
```

Build output paths:

- App server: `packages/app/dist`
- Live: `packages/live/dist`
- Historical: `packages/historical/dist`

## Run Built Output

Build first, then start the app server:

```bash
pnpm build
pnpm start
```

Open:

- Live: `http://localhost:8080/`
- Historical: `http://localhost:8080/historical/`
- Health: `http://localhost:8080/health`

The app server proxies `/v1/*` to OpenF1. Override the upstream target with:

```bash
OPENF1_API_TARGET=http://localhost:8000 pnpm start
```

Team radio audio is served by the app server at `/v1/radio-proxy/*`.

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

1. Put server/static/proxy work in `packages/app`.
2. Put live app work in `packages/live`.
3. Put historical browser work in `packages/historical`.
4. Put reusable API/types/components/constants in `packages/shared`.
5. Keep OpenF1 clean; dashboard-specific serving/proxy behavior belongs in `@f1-dashboard/app`.
6. Run `pnpm build` after TypeScript, package boundary, routing, or Vite base changes.
7. For deployment changes, verify `/`, `/historical/`, a static asset from each app, and a `/v1/*` API request through the app server.

## Data Source

The apps expect an OpenF1-compatible API. Data availability depends on the upstream API and selected session. Live data may be sparse outside active race weekends, and historical coverage varies by endpoint and year.
