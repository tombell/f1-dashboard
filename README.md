# F1 Dashboard

Live timing dashboard and historical browser for Formula 1 sessions. The repo is a pnpm monorepo with one Vite SPA and one Fastify app/API proxy.

## Stack

- pnpm workspace
- Fastify app server in `packages/app`
- React 19, Vite 8, Tailwind CSS v4
- TypeScript
- React Router
- OpenF1-compatible API proxied through `/v1/*`

## Packages

- `packages/dashboard` — single SPA for live timing at `/` and historical browsing at `/historical`.
- `packages/app` — Fastify server named `@f1-dashboard/app`; serves the built dashboard and proxies OpenF1.
- `packages/ingestor` — ingestor package, if present, remains independent.

## Prerequisites

- Node.js 22 or newer
- pnpm
- OpenF1 API available at `http://brighid.solarflare-skink.ts.net:8000`, or set `OPENF1_API_TARGET`

## Install

```bash
pnpm install
```

## Development

Run the dashboard and app server together:

```bash
pnpm dev
```

Or run one package:

```bash
pnpm dev:dashboard
pnpm dev:app
```

Default development URLs:

- Dashboard Vite app with hot reload: `http://localhost:5173/`
- Historical route with hot reload: `http://localhost:5173/historical`
- App server/API proxy: `http://localhost:8080`

In dev, open the Vite URL (`5173`) for HMR. The dashboard dev server proxies `/v1/*` to the Fastify app (`8080`), and the app proxies that to `OPENF1_API_TARGET`. Override the dashboard-to-app proxy with `DASHBOARD_API_PROXY_TARGET` if needed.

## Build

Build the dashboard and Fastify app server:

```bash
pnpm build
```

Build one package:

```bash
pnpm build:dashboard
pnpm build:app
```

Build output paths:

- Dashboard: `packages/dashboard/dist`
- App server: `packages/app/dist`

## Run Built Output

Build first, then start the app server:

```bash
pnpm build
pnpm start
```

Open:

- Live: `http://localhost:8080/`
- Historical: `http://localhost:8080/historical`
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

1. Put SPA work in `packages/dashboard`.
2. Put server/static/proxy work in `packages/app`.
3. Keep dashboard-specific serving/proxy behavior in `@f1-dashboard/app`.
4. Run `pnpm build` after TypeScript, package boundary, routing, or Vite base changes.
5. For deployment changes, verify `/`, `/historical`, a static asset, and a `/v1/*` API request through the app server.

## Data Source

The dashboard expects an OpenF1-compatible API. Data availability depends on the upstream API and selected session. Live data may be sparse outside active race weekends, and historical coverage varies by endpoint and year.
