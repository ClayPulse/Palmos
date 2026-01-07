import express from "express";
import http from "http";
import https from "https";
import { multiStdioToStatelessStreamableHttp } from "../../lib/supergateway/src/gateways/stdioToStatelessStreamableHttp";
import { corsOrigin } from "../../lib/supergateway/src/lib/corsOrigin";
import { getLogger } from "../../lib/supergateway/src/lib/getLogger";
import { headers } from "../../lib/supergateway/src/lib/headers";

const HOST = "0.0.0.0";

export async function addMCPServers(
  server: http.Server | https.Server,
  expressApp: express.Express,
  port: number,
) {
  const logger = getLogger({
    logLevel: "info",
    outputTransport: "streamableHttp",
  });

  await multiStdioToStatelessStreamableHttp(
    {
      servers: [
        {
          path: "/mcp-servers/fs",
          stdioCmd: "npx -y @modelcontextprotocol/server-filesystem .",
        },
        {
          path: "/mcp-servers/terminal",
          stdioCmd: "npx -y mcp-server-commands",
        },
      ],
      corsOrigin: corsOrigin({
        argv: {
          cors: ["*"],
        },
      }),
      headers: headers({
        argv: {
          header: [],
          oauth2Bearer: undefined,
        },
        logger: logger,
      }),
      protocolVersion: "2024-11-05",
      port: port,
      healthEndpoints: [],
      logger,
      streamableHttpPath: "/mcp",
    },
    expressApp,
  );

  server.listen(port, HOST);
}
