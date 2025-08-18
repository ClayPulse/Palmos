import express from "express";
import https from "https";
import http from "http";
import fs from "fs";
import dotenv from "dotenv";
import { handlePlatformAPIRequest } from "./platform-api/handler";

dotenv.config();

const app = express();
const HOST = "0.0.0.0";
const HTTP_SERVER_PORT = 6080;
const HTTPS_SERVER_PORT = 6443;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

export async function createAPIServer() {
  await createEndpoints(app);

  if (
    certPath &&
    keyPath &&
    fs.existsSync(certPath) &&
    fs.existsSync(keyPath)
  ) {
    const server = https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      app
    );
    server.listen(HTTPS_SERVER_PORT, HOST, () => {
      console.log(`HTTPS server is running on port ${HTTPS_SERVER_PORT}`);
    });
    return server;
  } else {
    const server = http.createServer(app);
    server.listen(HTTP_SERVER_PORT, HOST, () => {
      console.log(`HTTP server is running on port ${HTTP_SERVER_PORT}`);
    });
    return server;
  }
}

async function createEndpoints(app: express.Express) {
  app.use(express.json());

  app.get("/:instanceId/", (req, res) => {
    const instanceId = req.params.instanceId;
    if (instanceId !== process.env.INSTANCE_ID) {
      return res.status(400).send("Invalid instance ID");
    }
    // Get the requested URL
    const serverUrl = req.protocol + "://" + req.get("host") + req.originalUrl;

    // Redirect to https://editor.pulse-editor.com and append
    // this instance's URL as a query parameter
    const url = new URL(
      process.env.FRONTEND_URL ?? "https://editor.pulse-editor.com"
    );
    url.searchParams.append("instance", serverUrl);
    res.redirect(url.toString());
  });

  app.get("/:instanceId/test", (req, res) => {
    const instanceId = req.params.instanceId;
    if (instanceId !== process.env.INSTANCE_ID) {
      return res.status(400).send("Invalid instance ID");
    }
    res.send("Remote instance is running!");
  });

  app.post("/:instanceId/platform-api", async (req, res) => {
    const instanceId = req.params.instanceId;
    if (instanceId !== process.env.INSTANCE_ID) {
      return res.status(400).send("Invalid instance ID");
    }

    // Get json body
    const body = req.body;

    console.log("Received platform API request:", body);

    const host = req.host;

    const result = await handlePlatformAPIRequest(
      body,
      host,
      instanceId
    );

    // Process the request and send a response
    res.send(result);
  });
}
