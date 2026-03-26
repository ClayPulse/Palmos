import { EditorContext } from "@/components/providers/editor-context-provider";
import { IMCContext } from "@/components/providers/imc-provider";
import { IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useContext, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { AppNodeData, WorkflowContent } from "../types";
import useWorkflowExecutor from "./use-workflow-executor";

export default function useCanvasWorkflow(
  initialWorkflowContent?: WorkflowContent,
) {
  const editorContext = useContext(EditorContext);
  const imcContext = useContext(IMCContext);

  const [entryPoint, setEntryPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  const [exitPoint, setExitPoint] = useState<
    ReactFlowNode<AppNodeData> | undefined
  >(undefined);

  const [localNodes, setLocalNodes] = useNodesState(
    initialWorkflowContent?.nodes ?? [],
  );
  const [localEdges, setLocalEdges] = useEdgesState(
    initialWorkflowContent?.edges ?? [],
  );

  const [isRestored, setIsRestored] = useState(false);

  const debouncedGetEntryPoint = useDebouncedCallback(() => {
    const entry =
      localNodes.find((node) => node.selected) ??
      localNodes.find((node) => node.data.isDefaultEntry);
    setEntryPoint(entry);
  }, 200);

  const debouncedGetExitPoint = useDebouncedCallback(() => {
    const exit = localNodes.find((node) => node.data.isDefaultExit);
    setExitPoint(exit);
  }, 200);

  const debounceSetSelectedViews = useDebouncedCallback(() => {
    const viewIds = localNodes
      .filter((n) => n.selected)
      .map((n) => n.data.config.viewId);

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      selectedViewIds: viewIds,
    }));
  }, 200);

  const debounceSaveNodesAndEdges = useDebouncedCallback(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      workflowNodes: localNodes,
      workflowEdges: localEdges,
    }));
  }, 500);

  const updateWorkflowNodeData = useCallback(
    (nodeViewId: string, data: Partial<AppNodeData>) => {
      setLocalNodes((prev) => {
        const index = prev.findIndex((n) => n.id === nodeViewId);
        if (index === -1) return prev;
        const node = prev[index];
        const newNode = {
          ...node,
          data: {
            ...node.data,
            ...data,
          },
        };
        const newNodes = [...prev];
        newNodes[index] = newNode;
        return newNodes;
      });
    },
    [localNodes],
  );

  const updateWorkflowNodes = useCallback(
    (
      updater: (
        oldNodes: ReactFlowNode<AppNodeData>[],
      ) => ReactFlowNode<AppNodeData>[],
    ) => {
      const updatedNodes = updater(localNodes ?? []);
      setLocalNodes(updatedNodes);
    },
    [localNodes],
  );
  const updateWorkflowEdges = useCallback(
    (updater: (oldEdges: ReactFlowEdge[]) => ReactFlowEdge[]) => {
      const updatedEdges = updater(localEdges ?? []);
      setLocalEdges(updatedEdges);
    },
    [localEdges],
  );

  const exportWorkflow = useCallback(async () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            nodes: localNodes,
            edges: localEdges,
            snapshotStates: await saveAppsSnapshotStates(),
          } as WorkflowContent,
          null,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [localNodes, localEdges, entryPoint]);

  // Update entry points
  useEffect(() => {
    debouncedGetEntryPoint();
    debouncedGetExitPoint();
    debounceSetSelectedViews();
  }, [localNodes]);

  useEffect(() => {
    debounceSaveNodesAndEdges();
  }, [localNodes, localEdges]);

  // Restore snapshot states upon loading a workflow
  useEffect(() => {
    async function restore() {
      if (!imcContext) return;
      else if (isRestored) return;
      else if (!initialWorkflowContent) return;
      setIsRestored(true);

      if (initialWorkflowContent.snapshotStates) {
        await restoreAppsSnapshotStates(initialWorkflowContent);
      }
    }

    restore();
  }, [initialWorkflowContent, imcContext, isRestored]);

  // Update callback
  useEffect(() => {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      updateWorkflowNodeData: updateWorkflowNodeData,
    }));
  }, [updateWorkflowNodeData]);

  const {
    startWorkflow,
    startWorkflowFromNode,
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
  } = useWorkflowExecutor({
      localNodes,
      localEdges,
      entryPoint,
      updateWorkflowNodeData,
    });

  const saveAppsSnapshotStates = useCallback(async () => {
    const apps =
      editorContext?.editorStates.workflowNodes.map(
        (node) => node.data.config,
      ) ?? [];

    const appStates = await Promise.all(
      apps.map(async (app) => {
        if (!app.viewId) return null;

        // Do a time out because the app may not use snapshot feature
        return await Promise.race([
          new Promise<any>((resolve) => setTimeout(() => resolve(null), 2000)),
          (async () => {
            // All IMC channels' states
            const channelsStates = await imcContext?.polyIMC?.sendMessage(
              app.viewId,
              IMCMessageTypeEnum.EditorAppStateSnapshotSave,
            );

            // Consolidate states from all channels into one for this view ID
            const states = channelsStates?.reduce((acc, curr) => {
              return { ...acc, ...curr };
            }, {});

            return { appId: app.viewId, states: states };
          })(),
        ]);
      }),
    );

    const appStatesMap = appStates
      .filter((s) => s && s.states)
      .reduce(
        (acc, curr) => {
          if (curr) {
            acc[curr.appId] = curr.states;
          }
          return acc;
        },
        {} as { [key: string]: any },
      );

    return appStatesMap;
  }, [editorContext?.editorStates.workflowNodes, imcContext?.polyIMC]);

  async function restoreAppsSnapshotStates(content: WorkflowContent) {
    if (!imcContext || !imcContext.polyIMC) {
      console.error("IMC context not available for restoring snapshot states");
      return;
    } else if (!content.snapshotStates) return;

    const apps = content.nodes.map((node) => node.data.config);
    for (const app of apps) {
      if (!app.viewId) continue;
      if (content.snapshotStates[app.viewId]) {
        // Wait until the view is initialized
        await imcContext.resolveWhenViewInitialized(app.viewId);
        // Send snapshot restore message
        await imcContext.polyIMC.sendMessage(
          app.viewId,
          IMCMessageTypeEnum.EditorAppStateSnapshotRestore,
          content.snapshotStates[app.viewId],
        );
      }
    }
  }

  return {
    localNodes,
    localEdges,
    entryPoint,
    startWorkflow,
    startWorkflowFromNode,
    pauseWorkflow,
    resumeWorkflow,
    resetWorkflow,
    updateWorkflowNodes,
    updateWorkflowEdges,
    exportWorkflow,
    updateWorkflowNodeData,
    saveAppsSnapshotStates,
    restoreAppsSnapshotStates,
  };
}
