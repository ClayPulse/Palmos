/**
 *  This is a local dev server for "npm run dev" and "npm run preview".
 */

import connectLivereload from "connect-livereload";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import livereload from "livereload";
import { networkInterfaces } from "os";
import path from "path";
import { pipeline, Readable } from "stream";
import { pathToFileURL } from "url";
import { promisify } from "util";
import { readConfigFile } from "../webpack/configs/utils.js";

dotenv.config({
  quiet: true,
});

const isPreview = process.env?.["PREVIEW"];
const isDev = process.env?.["NODE_ENV"] === "development";
const workspaceId = process.env?.["WORKSPACE_ID"];

const pulseConfig = await readConfigFile();

if (isDev || isPreview) {
  const livereloadServer = livereload.createServer({
    // @ts-expect-error override server options
    host: "0.0.0.0",
  });
  livereloadServer.watch("dist");
  livereloadServer.server.once("connection", () => {
    console.log("✅ LiveReload connected");
  });
}

const skillActions = pulseConfig?.actions || [];
const skillActionNames: string[] = skillActions.map((a: any) => a.name);

const app = express();
app.use(cors());
// Inject the client-side livereload script into HTML responses
app.use(
  // The port might not be right here for the ingress.
  // I need this route to be exposed
  connectLivereload({
    // @ts-expect-error override server options
    host: workspaceId
      ? `${workspaceId}.workspace.palmos.ai"`
      : undefined,
    port: workspaceId ? 443 : 35729,
  }),
);

app.use(express.json());

// Log each request to the console
app.use((req, res, next) => {
  console.log(`✅ [${req.method}] Received: ${req.url}`);
  return next();
});

// Serve backend
app.use(
  `/${pulseConfig.id}/${pulseConfig.version}/server`,
  express.static("dist/server"),
);
// Catch backend function calls
app.all(/^\/server-function\/(.*)/, async (req, res) => {
  const func = req.params[0];

  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  // Convert Express req -> Fetch Request
  const request = new Request(url, {
    method: req.method,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers: req.headers as any,
    body: ["GET", "HEAD"].includes(req.method)
      ? null
      : JSON.stringify(req.body),
  });

  const dir = path.resolve(
    "node_modules/@pulse-editor/cli/dist/lib/server/preview/backend/load-remote.cjs",
  );

  const fileUrl = pathToFileURL(dir).href;

  const { loadFunc, loadPrice } = await import(fileUrl);

  const price = await loadPrice(
    func,
    pulseConfig.id,
    "http://localhost:3030",
    pulseConfig.version,
  );

  if (price) {
    // Make func name and price bold in console
    console.log(
      `🏃 Running server function \x1b[1m${func}\x1b[0m, credits consumed: \x1b[1m${price}\x1b[0m`,
    );
  } else {
    console.log(`🏃 Running server function \x1b[1m${func}\x1b[0m.`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadedFunc = await loadFunc(
    func,
    pulseConfig.id,
    "http://localhost:3030",
    pulseConfig.version,
  );

  const funcResult = await loadedFunc(request);

  const streamPipeline = promisify(pipeline);

  if (funcResult) {
    // 1️⃣ Set status code
    res.status(funcResult.status);

    console.log(
      `✅ Server function "${func}" completed with status ${funcResult.status}.`,
    );

    // 2️⃣ Copy headers
    funcResult.headers.forEach((value: any, key: any) => {
      res.setHeader(key, value);
    });

    // 3️⃣ Pipe body if present
    if (funcResult.body) {
      const nodeStream = Readable.fromWeb(funcResult.body);
      await streamPipeline(nodeStream, res);
    } else {
      res.end();
    }
  } else {
    console.log(`✅ Server function "${func}" completed with no content.`);
    res.status(204).end();
  }
});

if (isPreview) {
  /* Preview mode */
  app.get("/pulse.config.json", async (_req, res) => {
    try {
      const data = await import("fs/promises").then((fs) =>
        fs.readFile("dist/pulse.config.json", "utf-8"),
      );
      res.type("json").send(data);
    } catch {
      res.status(404).json({ error: "pulse.config.json not found" });
    }
  });

  app.use(express.static("dist/client"));

  // Expose skill actions as REST API endpoints in dev and preview modes
  app.post("/skill/:actionName", async (req, res) => {
    const { actionName } = req.params;

    if (skillActionNames.length > 0 && !skillActionNames.includes(actionName)) {
      res
        .status(404)
        .json({ error: `Skill action "${actionName}" not found.` });
      return;
    }

    const dir = path.resolve(
      "node_modules/@pulse-editor/cli/dist/lib/server/preview/backend/load-remote.cjs",
    );
    const fileUrl = pathToFileURL(dir).href;
    const { loadFunc } = await import(fileUrl);

    try {
      const action = await loadFunc(
        `skill/${actionName}`,
        pulseConfig.id,
        "http://localhost:3030",
        pulseConfig.version,
      );
      const result = await action(req.body);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `❌ Error running skill action "${actionName}": ${message}`,
      );
      res.status(500).json({ error: message });
    }
  });

  app.listen(3030, "0.0.0.0");
} else if (isDev) {
  /* Dev mode  */
  app.use(`/${pulseConfig.id}/${pulseConfig.version}`, express.static("dist"));

  // Expose skill actions as REST API endpoints in dev and preview modes
  app.post(`/skill/:actionName`, async (req, res) => {
    const { actionName } = req.params;

    if (skillActionNames.length > 0 && !skillActionNames.includes(actionName)) {
      res
        .status(404)
        .json({ error: `Skill action "${actionName}" not found.` });
      return;
    }

    const dir = path.resolve(
      "node_modules/@pulse-editor/cli/dist/lib/server/preview/backend/load-remote.cjs",
    );
    const fileUrl = pathToFileURL(dir).href;
    const { loadFunc } = await import(fileUrl);

    try {
      const action = await loadFunc(
        `skill/${actionName}`,
        pulseConfig.id,
        "http://localhost:3030",
        pulseConfig.version,
      );
      const result = await action(req.body);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `❌ Error running skill action "${actionName}": ${message}`,
      );
      res.status(500).json({ error: message });
    }
  });

  app.listen(3030, "0.0.0.0");
} else {
  /* Production mode */
  app.use(`/${pulseConfig.id}/${pulseConfig.version}`, express.static("dist"));

  app.listen(3030, "0.0.0.0", () => {
    console.log(`\
🎉 Your Pulse extension \x1b[1m${pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030/${pulseConfig.id}/${pulseConfig.version}/
⚡️ Network: http://${getLocalNetworkIP()}:3030/${pulseConfig.id}/${
      pulseConfig.version
    }/

✨ Try it out in the Pulse Editor and let the magic happen! 🚀`);
  });
}

function getLocalNetworkIP() {
  const interfaces = networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const config of iface) {
      if (config.family === "IPv4" && !config.internal) {
        return config.address; // Returns the first non-internal IPv4 address
      }
    }
  }
  return "localhost"; // Fallback
}
