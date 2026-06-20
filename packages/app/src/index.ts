import fs from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import cors from "@fastify/cors";
import proxy from "@fastify/http-proxy";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const OPENF1_API_TARGET =
  process.env.OPENF1_API_TARGET ?? "http://brighid.solarflare-skink.ts.net:8000";

const currentFilename = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilename);

const fastify = Fastify({
  logger: false,
});

await fastify.register(cors, {
  origin: true,
});

fastify.get("/health", async () => ({
  status: "ok",
  upstream: OPENF1_API_TARGET,
}));

fastify.get<{ Params: { "*": string } }>("/v1/radio-proxy/*", async (request, reply) => {
  const upstreamUrl = `https://livetiming.formula1.com/static/${request.params["*"]}`;
  const upstream = await fetch(upstreamUrl, {
    headers: request.headers.range ? { range: request.headers.range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return reply.code(502).send({ error: `Radio proxy upstream returned ${upstream.status}` });
  }

  const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");

  reply.code(upstream.status).type(contentType);
  if (contentLength) reply.header("content-length", contentLength);
  if (contentRange) reply.header("content-range", contentRange);
  reply.header("accept-ranges", "bytes");

  return reply.send(upstream.body);
});

await fastify.register(proxy, {
  upstream: OPENF1_API_TARGET,
  prefix: "/v1",
  rewritePrefix: "/v1",
});

const dashboardPath = resolve(currentDir, "..", "..", "dashboard", "dist");
const hasDashboard = fs.existsSync(dashboardPath) && fs.statSync(dashboardPath).isDirectory();

if (hasDashboard) {
  await fastify.register(fastifyStatic, {
    root: dashboardPath,
    prefix: "/",
  });
  console.log(`[f1-app] Serving dashboard from ${dashboardPath}`);
} else {
  console.log("[f1-app] No dashboard build found");
}

fastify.setNotFoundHandler(async (request, reply) => {
  if (request.url.startsWith("/v1/")) {
    return reply.code(404).send({ error: "Not found" });
  }

  if (hasDashboard) {
    return reply.type("text/html").send(fs.createReadStream(resolve(dashboardPath, "index.html")));
  }

  return reply.code(404).send({
    error: "Dashboard build not found",
    expected: dashboardPath,
  });
});

async function main() {
  try {
    await fastify.listen({ host: "0.0.0.0", port: PORT });
    console.log(`[f1-app] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[f1-app] Proxying /v1/* to ${OPENF1_API_TARGET}`);
  } catch (err) {
    console.error("[f1-app] Failed to start:", err);
    process.exit(1);
  }
}

const shutdown = async () => {
  console.log("\n[f1-app] Shutting down...");
  await fastify.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
