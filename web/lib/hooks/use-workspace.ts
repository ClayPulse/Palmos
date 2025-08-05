import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import { PlatformEnum, RemoteWorkspace } from "../types";
import { getPlatform } from "../platform-api/platform-checker";
import { useAuth } from "./use-auth";
import useSWR from "swr";

export function useWorkspace() {
  const editorContext = useContext(EditorContext);
  const [workspace, setWorkspace] = useState<RemoteWorkspace | undefined>(
    undefined,
  );
  const { session } = useAuth();

  const { data: cloudWorkspaces } = useSWR<RemoteWorkspace[]>(
    session ? "https://pulse-editor.com/api/workspace/list" : null,
    async (url: string) => {
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch workspace data");
      }
      const {
        workspaces,
      }: {
        workspaces: RemoteWorkspace[];
      } = await res.json();

      return workspaces;
    },
  );

  // Update workspace state when the editor context changes
  useEffect(() => {
    if (editorContext?.editorStates?.currentWorkspace) {
      setWorkspace(editorContext.editorStates.currentWorkspace);
    }
  }, [editorContext?.editorStates?.currentWorkspace]);

  async function createWorkspace(name: string) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    } else if (getPlatform() !== PlatformEnum.Web) {
      throw new Error(
        "Workspace creation is only supported on the web platform.",
      );
    } else if (!session) {
      throw new Error("User is not authenticated.");
    }

    // Request to create a new workspace
    const response = await fetch(
      "https://pulse-editor.com/api/workspace/create",
      {
        credentials: "include",
      },
    );

    const {
      id,
      createdAt,
      updatedAt,
    }: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    } = await response.json();

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        currentWorkspace: {
          id,
          name,
          address: `https://pulse-editor.com/workspace/${id}`,
          createdAt,
          updatedAt,
        },
      };
    });
  }

  function updateWorkspace(updatedWorkspace: RemoteWorkspace) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        currentWorkspace: updatedWorkspace,
      };
    });
  }

  function selectWorkspace(workspaceId: string) {
    if (!editorContext) {
      throw new Error("Editor context is not available");
    }

    const selectedWorkspace = cloudWorkspaces?.find(
      (ws) => ws.id === workspaceId,
    );

    if (!selectedWorkspace) {
      throw new Error("Workspace not found");
    }

    editorContext.setEditorStates((prev) => {
      return {
        ...prev,
        currentWorkspace: selectedWorkspace,
      };
    });
  }

  return {
    workspace,
    cloudWorkspaces,
    createWorkspace,
    updateWorkspace,
    selectWorkspace,
  };
}
