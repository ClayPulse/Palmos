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
import Icon from "../misc/icon";
import { useAppInfo } from "@/lib/hooks/use-app-info";
import { AppInfoModalContent } from "@/lib/types";
import { useMenuActions } from "@/lib/hooks/use-menu-actions";

const initialNodes = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
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

export default function CanvasView() {
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
    ) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
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

  const { registerMenuAction } = useMenuActions();
  // Register menu actions
  useEffect(() => {
    registerMenuAction({
      name: "Export Workflow",
      menuCategory: "file",
      description: "Export the current workflow as a JSON file",
      shortcut: "Ctrl+Alt+E",
      actionFunc: () => {
        exportWorkflow();
      },
      icon: "download",
    });
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
