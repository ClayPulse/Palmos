import { EditorContext } from "@/components/providers/editor-context-provider";
import { useCallback, useContext, useEffect, useRef } from "react";
import useSWR from "swr";
import { PlatformEnum } from "../enums";
import { getAbstractPlatformAPI } from "../platform-api/get-platform-api";
import { getPlatform } from "../platform-api/platform-checker";
import { fetchAPI } from "../pulse-editor-website/backend";
import { WorkspaceConfig } from "../types";
import { useAuth } from "./use-auth";

export function useWorkspace(isFetchContent: boolean = true) {
  const editorContext = useContext(EditorContext);
  const { session } = useAuth();

  const workspace = editorContext?.editorStates?.currentWorkspace;

  const { data: cloudWorkspaces, mutate: mutateCloudWorkspaces } = useSWR<
    WorkspaceConfig[]
  >(
    session && isFetchContent ? `/api/workspace/list` : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) {
        throw new Error("Failed to fetch workspace data");
      }
      const {
        workspaces,
      }: {
        workspaces: WorkspaceConfig[];
      } = await res.json();

      return workspaces;
    },
  );

  // Check workspace status
  const { data: isWorkspaceHealthy } = useSWR<boolean>(
    workspace
      ? `/api/workspace/check-health?workspaceId=${workspace.id}`
      : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      if (!res.ok) {
        throw new Error("Failed to fetch workspace health status");
      }

      const {
        status,
      }: {
        status: string;
      } = await res.json();
      return status === "ready";
    },
    {
      refreshInterval: 5000,
    },
  );

  const waitUntilRunningResolve = useRef<() => void>(null);

  useEffect(() => {
    if (isWorkspaceHealthy && waitUntilRunningResolve.current) {
      waitUntilRunningResolve.current();
      waitUntilRunningResolve.current = null;
    }
  }, [isWorkspaceHealthy]);

  useEffect(() => {
    // Update current workspace if the cloud workspaces have changed
    if (workspace && cloudWorkspaces) {
      const updatedWorkspace = cloudWorkspaces.find(
        (ws) => ws.id === workspace.id,
      );

      const hasChange =
        JSON.stringify(updatedWorkspace) !== JSON.stringify(workspace);

      if (updatedWorkspace && hasChange) {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          currentWorkspace: updatedWorkspace,
        }));
      }
    }
  }, [cloudWorkspaces, workspace]);

  const setWorkspace = (ws: WorkspaceConfig | undefined) => {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }
    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        currentWorkspace: ws,
      };
    });
  };

  async function createWorkspace(
    name: string,
    specs: string,
    volumeSize: string,
  ) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (!session) {
      throw new Error("User is not authenticated.");
    }

    // Request to create a new workspace
    const response = await fetchAPI(`/api/workspace/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, specs, volumeSize }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const {
      id,
    }: {
      id: string;
    } = await response.json();

    const updated = await mutateCloudWorkspaces();
    const newWorkspace = updated?.find((ws) => ws.id === id);
    setWorkspace(newWorkspace);
  }

  async function updateWorkspace(workspaceId: string, name: string) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    // Request to update the workspace
    await fetchAPI(`/api/workspace/update`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        workspaceId,
      }),
    });

    await mutateCloudWorkspaces();
  }

  async function selectWorkspace(workspaceId: string | undefined) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    // Reset previous workspace content
    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        workspaceContent: undefined,
        explorerSelectedNodeRefs: [],
      };
    });

    if (!workspaceId) {
      // Unselect workspace
      setWorkspace(undefined);
      return;
    }

    const selectedWorkspace = cloudWorkspaces?.find(
      (ws) => ws.id === workspaceId,
    );

    if (!selectedWorkspace) {
      throw new Error("Workspace not found");
    }

    setWorkspace(selectedWorkspace);
  }

  async function deleteWorkspace(workspaceId: string) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const response = await fetchAPI(`/api/workspace/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceId }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete workspace");
    }

    setWorkspace(undefined);
    mutateCloudWorkspaces();
  }

  async function startWorkspace(workspaceId: string) {
    const response = await fetchAPI(`/api/workspace/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceId }),
    });
    if (!response.ok) {
      throw new Error("Failed to start workspace");
    }

    await mutateCloudWorkspaces();
  }

  async function stopWorkspace(workspaceId: string) {
    const response = await fetchAPI(`/api/workspace/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceId }),
    });
    if (!response.ok) {
      throw new Error("Failed to stop workspace");
    }

    await mutateCloudWorkspaces();
  }

  async function refreshWorkspaceContent(
    ws: WorkspaceConfig | undefined = workspace,
  ) {
    if (getPlatform() !== PlatformEnum.Electron) {
      await waitUntilWorkspaceRunning();
    }

    const api = getAbstractPlatformAPI(ws);

    let projectUri = "";
    if (getPlatform() === PlatformEnum.Electron && !workspace) {
      const homePath = editorContext?.persistSettings?.projectHomePath;
      const projectName = editorContext?.editorStates.project;
      projectUri = homePath + "/" + projectName;
    } else {
      projectUri = "/workspace";
    }

    const objects = await api?.listPathContent(projectUri, {
      include: "all",
      depth: 1,
    });

    editorContext?.setEditorStates((prev) => {
      return {
        ...prev,
        workspaceContent: objects,
        explorerSelectedNodeRefs: [],
      };
    });

    console.log("Found project content:", objects);
  }

  const waitUntilWorkspaceRunning = useCallback(async () => {
    if (isWorkspaceHealthy) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      waitUntilRunningResolve.current = resolve;
    });
  }, [isWorkspaceHealthy]);

  return {
    workspace,
    isWorkspaceHealthy,
    cloudWorkspaces,
    createWorkspace,
    updateWorkspace,
    selectWorkspace,
    deleteWorkspace,
    startWorkspace,
    stopWorkspace,
    refreshWorkspaceContent,
    waitUntilWorkspaceRunning,
  };
}
