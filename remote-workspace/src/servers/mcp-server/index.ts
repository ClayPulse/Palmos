import dotenv from "dotenv";
import express from "express";
import { multiStdioToSse } from "../../lib/supergateway/src/gateways/stdioToSse";
import { corsOrigin } from "../../lib/supergateway/src/lib/corsOrigin";
import { getLogger } from "../../lib/supergateway/src/lib/getLogger";
import { headers } from "../../lib/supergateway/src/lib/headers";

dotenv.config();

const workspacePath = process.env.WORKSPACE_PATH;

export async function addMCPServers(
  expressApp: express.Express,
  instanceId: string,
  port: number,
) {
  const logger = getLogger({
    logLevel: "info",
    outputTransport: "sse",
  });

  await multiStdioToSse(
    {
      servers: [
        {
          path: `/${instanceId}/mcp-servers/fs`,
          stdioCmd: `${workspacePath ? `cd ${workspacePath} && ` : ""}npx -y @modelcontextprotocol/server-filesystem .`,
        },
        {
          path: `/${instanceId}/mcp-servers/terminal`,
          stdioCmd: `${workspacePath ? `cd ${workspacePath} && ` : ""}npx -y mcp-server-commands@0.6`,
        },
      ],
      corsOrigin: corsOrigin({
        argv: {
          cors: ["*"],
        },
      }),
      headers: headers({
        argv: {
          header: ["X-Accel-Buffering: no"],
          oauth2Bearer: undefined,
        },
        logger: logger,
      }),
      port: port,
      healthEndpoints: [],
      logger,
      ssePath: "/sse",
      baseUrl: "",
      messagePath: "/message",
    },
    expressApp,
  );
}
