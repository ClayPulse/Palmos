import express from "express";
import { createTerminalServer } from "./node-pty/node-pty-server";
import https from "https";
import http from "http";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const HOST = "0.0.0.0";
const HTTP_SERVER_PORT = 6080;
const HTTPS_SERVER_PORT = 6443;

app.get("/:appname/", (_req, res) => {
  // Get the requested URL
  const serverUrl = _req.protocol + "://" + _req.get("host") + _req.originalUrl;

  // Redirect to https://editor.pulse-editor.com and append
  // this instance's URL as a query parameter
  const url = new URL(
    process.env.FRONTEND_URL ?? "https://editor.pulse-editor.com"
  );
  url.searchParams.append("instance", serverUrl);
  res.redirect(url.toString());
});

app.get("/:appname/test", (_req, res) => {
  res.send("Remote instance is running!");
});

const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

// Check if the certs directory exists
if (
  !certPath ||
  !keyPath ||
  !fs.existsSync(certPath) ||
  !fs.existsSync(keyPath)
) {
  console.log("SSL certificates not found. Using HTTP instead of HTTPS. ");

  const server = http.createServer(app);

  // Start the terminal websocket server
  createTerminalServer(server);

  server.listen(HTTP_SERVER_PORT, HOST, () => {
    console.log(`HTTP server is running on port ${HTTP_SERVER_PORT}`);
  });
} else {
  const server = https.createServer(
    {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    },
    app
  );

  // Start the terminal websocket server
  createTerminalServer(server);

  server.listen(HTTPS_SERVER_PORT, HOST, () => {
    console.log(`HTTPS server is running on port ${HTTPS_SERVER_PORT}`);
  });
}
