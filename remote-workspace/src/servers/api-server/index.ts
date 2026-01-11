import dotenv from "dotenv";
import express from "express";
import { handlePlatformAPIRequest } from "./platform-api/handler";

dotenv.config();

export async function addAPIServer(
  expressApp: express.Express,
  instanceId: string,
  frontendUrl: string,
) {
  await createEndpoints(expressApp, instanceId, frontendUrl);
}

async function createEndpoints(
  app: express.Express,
  instanceId: string,
  frontendUrl: string,
) {
  app.use(express.json());

  app.get("/:instanceId/", (req, res) => {
    const id = req.params.instanceId;
    if (id !== instanceId) {
      return res.status(400).send("Invalid instance ID");
    }
    // Get the requested URL
    const serverUrl = req.protocol + "://" + req.get("host") + req.originalUrl;

    // Redirect to https://editor.pulse-editor.com and append
    // this instance's URL as a query parameter
    const url = new URL(frontendUrl);
    url.searchParams.append("instance", serverUrl);
    res.redirect(url.toString());
  });

  app.get("/:instanceId/check-health", (req, res) => {
    const id = req.params.instanceId;
    if (id !== instanceId) {
      return res.status(400).send("Invalid instance ID");
    }
    res.send("Remote instance is running!");
  });

  app.post("/:instanceId/platform-api", async (req, res) => {
    const id = req.params.instanceId;
    if (id !== instanceId) {
      return res.status(400).send("Invalid instance ID");
    }

    // Get json body
    const { operation, args } = req.body;

    const result = await handlePlatformAPIRequest(
      {
        operation,
        args,
      },
      req.get("host") ?? "",
      instanceId,
    );

    // Process the request and send a response
    if (result && result.error) {
      res.status(400).json(result);
    } else {
      res.send(JSON.stringify(result));
    }
  });
}
