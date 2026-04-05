import { describe, expect, test } from "@jest/globals";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { config } from "dotenv";

config();

describe("Test MCP", () => {
  const workspaceId = process.env.TEST_WORKSPACE_ID;
  if (!workspaceId) throw new Error("Missing TEST_WORKSPACE_ID env var");

  test("Check File System tools", async () => {
    const client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    const fsSystemTransport = new SSEClientTransport(
      new URL(
        `https://${workspaceId}.workspace.palmos.ai/api-${workspaceId}/mcp-servers/fs/sse`,
      ),
      {},
    );

    await client.connect(fsSystemTransport);

    const toolsResult = await client.listTools();

    expect(toolsResult).toBeDefined();
    expect(Array.isArray(toolsResult.tools)).toBe(true);
    expect(toolsResult.tools.length).toBeGreaterThan(0);

    client.close();
  });

  test("Check Command tools", async () => {
    const client = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    const fsSystemTransport = new SSEClientTransport(
      new URL(
        `https://${workspaceId}.workspace.palmos.ai/api-${workspaceId}/mcp-servers/terminal/sse`,
      ),
      {},
    );

    await client.connect(fsSystemTransport);

    const toolsResult = await client.listTools();

    expect(toolsResult).toBeDefined();
    expect(Array.isArray(toolsResult.tools)).toBe(true);
    expect(toolsResult.tools.length).toBeGreaterThan(0);

    client.close();
  });
});
