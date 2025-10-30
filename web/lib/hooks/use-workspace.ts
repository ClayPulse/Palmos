import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { useContext } from "react";
import useSWR from "swr";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { getPlatform } from "../platform-api/platform-checker";
import { fetchAPI } from "../pulse-editor-website/backend";
import { RemoteWorkspace } from "../types";
import { useAuth } from "./use-auth";

export function useWorkspace() {
  const editorContext = useContext(EditorContext);
  const { session } = useAuth();

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

  const workspace = editorContext?.editorStates?.currentWorkspace;
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
    } else if (
      getPlatform() !== PlatformEnum.Web &&
      getPlatform() !== PlatformEnum.WebMobile
    ) {
      throw new Error(
        "Workspace creation is only supported on the web platform.",
      );
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

  function selectWorkspace(workspaceId: string | undefined) {
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

  async function refreshWorkspaceContent(platformApi: AbstractPlatformAPI) {
    const projectUri =
      editorContext?.persistSettings?.projectHomePath +
      "/" +
      editorContext?.editorStates.project;
    const objects = await platformApi?.listPathContent(projectUri, {
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

  return {
    workspace,
    cloudWorkspaces,
    createWorkspace,
    updateWorkspace,
    selectWorkspace,
    deleteWorkspace,
    refreshWorkspaceContent,
  };
}
