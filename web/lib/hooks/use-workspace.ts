import { EditorContext } from "@/components/providers/editor-context-provider";
import { useCallback, useContext, useEffect, useRef } from "react";
import useSWR from "swr";
import { getAbstractPlatformAPI } from "../platform-api/get-platform-api";
import { fetchAPI } from "../pulse-editor-website/backend";
import { RemoteWorkspace } from "../types";
import { useAuth } from "./use-auth";

export function useWorkspace() {
  const editorContext = useContext(EditorContext);
  const { session } = useAuth();

  const workspace = editorContext?.editorStates?.currentWorkspace;

  const { data: cloudWorkspaces, mutate: mutateCloudWorkspaces } = useSWR<
    RemoteWorkspace[]
  >(session ? `/api/workspace/list` : null, async (url: string) => {
    const res = await fetchAPI(url);
    if (!res.ok) {
      throw new Error("Failed to fetch workspace data");
    }
    const {
      workspaces,
    }: {
      workspaces: RemoteWorkspace[];
    } = await res.json();

    return workspaces;
  });

  // Check workspace status
  const { data: isWorkspaceRunning } = useSWR<boolean>(
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
    if (isWorkspaceRunning && waitUntilRunningResolve.current) {
      waitUntilRunningResolve.current();
      waitUntilRunningResolve.current = null;
    }
  }, [isWorkspaceRunning]);

  const setWorkspace = (ws: RemoteWorkspace | undefined) => {
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

  async function refreshWorkspaceContent(
    ws: RemoteWorkspace | undefined = workspace,
  ) {
    if (!ws) {
      // Reset all content
      editorContext?.setEditorStates((prev) => {
        return {
          ...prev,
          workspaceContent: undefined,
          explorerSelectedNodeRefs: [],
        };
      });
      return;
    }

    await waitUntilWorkspaceRunning();

    const api = getAbstractPlatformAPI(ws);

    const projectUri =
      editorContext?.persistSettings?.projectHomePath +
      "/" +
      editorContext?.editorStates.project;
    const objects = await api?.listPathContent(projectUri, {
      include: "all",
      isRecursive: true,
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

  const waitUntilWorkspaceRunning = useCallback(async ( ) => {
    if (isWorkspaceRunning) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      waitUntilRunningResolve.current = resolve;
    });
  }, [
    isWorkspaceRunning
  ])

  return {
    workspace,
    isWorkspaceRunning,
    cloudWorkspaces,
    createWorkspace,
    updateWorkspace,
    selectWorkspace,
    deleteWorkspace,
    refreshWorkspaceContent,
    waitUntilWorkspaceRunning,
  };
}
