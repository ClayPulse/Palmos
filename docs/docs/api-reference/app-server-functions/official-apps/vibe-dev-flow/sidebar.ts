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
          label: "Run Vibe coding flow and stream progress updates",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      items: [
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/generaterequest",
          label: "GenerateRequest",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/errorresponse",
          label: "ErrorResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/agenttaskmessage",
          label: "AgentTaskMessage",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/agenttaskmessageupdate",
          label: "AgentTaskMessageUpdate",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/agenttaskmessagetype",
          label: "AgentTaskMessageType",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/agenttaskmessagedatatype",
          label: "AgentTaskMessageDataType",
          className: "schema",
        },
        {
          type: "doc",
          id: "api-reference/app-server-functions/official-apps/vibe-dev-flow/schemas/agenttaskmessagedata",
          label: "AgentTaskMessageData",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
