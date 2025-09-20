import { Button } from "@heroui/react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, useEffect } from "react";
import Icon from "../../misc/icon";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import {
  AppInfoModalContent,
  AppViewConfig,
  CanvasViewConfig,
  MenuAction,
} from "@/lib/types";
import { useMenuActions } from "@/lib/hooks/use-menu-actions";
import AppNode from "./nodes/app-node";
import { v4 } from "uuid";

const initialNodes = [
  {
    id: "n1",
    position: { x: 200, y: 0 },
    data: {
      label: "Node 1",
      config: {
        viewId: v4(),
        app: "https://cdn.pulse-editor.com/extension/spin_wheel/0.0.1/",
      },
    },
    type: "appNode",
  },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];
const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

const appInfo: AppInfoModalContent = {
  name: "Pulse Editor",
  version: "1.0.0",
  author: "ClayPulse",
  license: "MIT",
  url: "https://pulse-editor.com",
  readme: `\
# Pulse Editor

Pulse Editor is a modular, cross-platform, AI-powered creativity platform with federated app collaboration and extensible workflows.

# Acknowledgements
- Thanks to the developers and community of [Module Federation](https://module-federation.io/) for their groundbreaking work on micro-frontends.
- Thanks to the developers and community of [Hero UI](https://www.heroui.com/) for their fantastic component library.
- Thanks to the developers and community of [React Flow](https://reactflow.dev/) for their amazing node-based graph library.
`,
};

export default function CanvasView({
  config,
  openViewInFullScreen,
}: {
  config?: CanvasViewConfig;
  openViewInFullScreen: (config: AppViewConfig) => void;
}) {
  const { openAppInfoModal } = useAppInfo();
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (
      changes: NodeChange<{
        id: string;
        position: { x: number; y: number };
        data: { label: string };
      }>[],
    ) => {
      console.log("Node changes:", changes);
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
    },
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<{ id: string; source: string; target: string }>[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: any) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  async function exportWorkflow() {
    const workflow = { nodes, edges };
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const createAppNode = useCallback(
    (props: any) => {
      return <AppNode {...props} openViewInFullScreen={openViewInFullScreen} />;
    },
    [openViewInFullScreen],
  );

  const { registerMenuAction, unregisterMenuAction } = useMenuActions();
  // Register menu actions
  useEffect(() => {
    console.log("CanvasView rendered: registering menu actions");

    const menuActions: MenuAction[] = [
      {
        name: "Export Workflow",
        menuCategory: "file",
        description: "Export the current workflow as a JSON file",
        shortcut: "Ctrl+Alt+E",
        actionFunc: async () => {
          await exportWorkflow();
        },
        icon: "download",
      },
      {
        name: "Import Workflow",
        menuCategory: "file",
        description: "Import a workflow from a JSON file",
        shortcut: "Ctrl+Alt+I",
        actionFunc: async () => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/json";
          input.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const workflow = JSON.parse(event.target?.result as string);
                if (workflow.nodes && workflow.edges) {
                  setNodes(workflow.nodes);
                  setEdges(workflow.edges);
                } else {
                  alert("Invalid workflow file");
                }
              } catch (err) {
                alert("Error reading workflow file");
              }
            };
            reader.readAsText(file);
          };
          input.click();
        },
        icon: "upload",
      },
    ];

    menuActions.forEach((action) => {
      registerMenuAction(action);
    });

    return () => {
      // Unregister menu actions on unmount
      menuActions.forEach((action) => {
        unregisterMenuAction(action);
      });
    };
  }, []);

  return (
    <div className="bg-default text-default-foreground relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{
          hideAttribution: true,
        }}
        nodeTypes={{
          appNode: createAppNode,
        }}
      />
      <Button
        isIconOnly
        className="absolute right-2 bottom-2"
        variant="light"
        onPress={() => {
          openAppInfoModal(appInfo);
        }}
      >
        <Icon name="info" />
      </Button>
    </div>
  );
}
