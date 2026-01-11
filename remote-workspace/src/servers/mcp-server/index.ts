import express from "express";
import { multiStdioToSse } from "../../lib/supergateway/src/gateways/stdioToSse";
import { corsOrigin } from "../../lib/supergateway/src/lib/corsOrigin";
import { getLogger } from "../../lib/supergateway/src/lib/getLogger";
import { headers } from "../../lib/supergateway/src/lib/headers";

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
          stdioCmd: "npx -y @modelcontextprotocol/server-filesystem .",
        },
        {
          path: `/${instanceId}/mcp-servers/terminal`,
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
