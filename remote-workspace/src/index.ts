import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import http from "http";
import https from "https";
import { getLocalNetworkIP } from "./lib/get-network";
import { addAPIServer } from "./servers/api-server";
import { addMCPServers } from "./servers/mcp-server";
import { addTerminalServer } from "./servers/node-pty";

dotenv.config();

const expressApp = express();
const serverPort = process.env.SERVER_PORT
  ? parseInt(process.env.SERVER_PORT)
  : 6080;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
const workspaceId = process.env.WORKSPACE_ID;
const frontendUrl = process.env.FRONTEND_URL ?? "https://web.pulse-editor.com";

const HOST = "0.0.0.0";

async function startServers() {
  if (!workspaceId) {
    console.error("WORKSPACE_ID is not set in environment variables.");
    process.exit(1);
  }

  /* Create servers */
  const server = await createServer();
  const address = getLocalNetworkIP();

  const isHttps =
    certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)
      ? true
      : false;

  await addMCPServers(expressApp, "api-"+ workspaceId, serverPort);
  console.log(
    `MCP servers are running at ${isHttps ? "https" : "http"}://${address}:${serverPort}/api-${workspaceId}/mcp-servers/`,
  );
  
  await addAPIServer(expressApp, "api-" + workspaceId, frontendUrl);
  console.log(
    `API server is running at ${isHttps ? "https" : "http"}://${address}:${serverPort}/api-${workspaceId}`,
  );

  await addTerminalServer(server, "api-" + workspaceId);
  console.log(
    `Terminal server is running at ${isHttps ? "wss" : "ws"}://${address}:${serverPort}/api-${workspaceId}/terminal/ws`,
  );

  server.listen(serverPort, HOST);
}

async function createServer() {
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
      expressApp,
    );
    return server;
  } else {
    const server = http.createServer(expressApp);
    return server;
  }
}

startServers();
