/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeMFClientConfig } from "./configs/mf-client.js";
import { makeMFServerConfig } from "./configs/mf-server.js";
import { makePreviewClientConfig } from "./configs/preview.js";

export async function createWebpackConfig(
  isPreview: boolean,
  buildTarget: "client" | "server" | "both",
  mode: "development" | "production",
) {
  if (isPreview) {
    const previewClientConfig = await makePreviewClientConfig("development");
    const mfServerConfig = await makeMFServerConfig("development");

    return [previewClientConfig, mfServerConfig];
  } else if (buildTarget === "server") {
    const mfServerConfig = await makeMFServerConfig(mode);

    return [mfServerConfig];
  } else if (buildTarget === "client") {
    const mfClientConfig = await makeMFClientConfig(mode);

    return [mfClientConfig];
  } else {
    const mfClientConfig = await makeMFClientConfig(mode);
    const mfServerConfig = await makeMFServerConfig(mode);

    return [mfClientConfig, mfServerConfig];
  }
}
