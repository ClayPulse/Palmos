import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/vibe-dev-flow-generate-endpoint",
    },
    {
      type: "category",
      label: "Generate Vibe App",
      items: [
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/generate-vibe-app",
          label: "Run Vibe coding flow and stream progress",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
