import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { useCallback, useContext, useEffect, useState } from "react";
import { AbstractPlatformAPI } from "../platform-api/abstract-platform-api";
import { CloudAPI } from "../platform-api/cloud/cloud-api";
import { ElectronAPI } from "../platform-api/electron/electron-api";
import { getPlatform } from "../platform-api/platform-checker";
import { useWorkspace } from "./use-workspace";

export function usePlatformApi() {
  const editorContext = useContext(EditorContext);

  const { workspace } = useWorkspace();

  const [platformApi, setPlatformApi] = useState<
    AbstractPlatformAPI | undefined
  >(undefined);

  const refreshWorkspaceContent = useCallback(async () => {
    if (!workspace) {
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

    const api = getAbstractPlatformAPI();

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
  }, [
    workspace,
    editorContext?.persistSettings?.projectHomePath,
    editorContext?.editorStates.project,
  ]);

  useEffect(() => {
    const api = getAbstractPlatformAPI();
    setPlatformApi(api);
  }, []);

  // When workspace changes, reset platform API if needed
  useEffect(() => {
    if (platformApi && workspace) {
      const api = getAbstractPlatformAPI();
      setPlatformApi(api);
    }
  }, [workspace]);

  // When workspace changes, re-fetch content
  useEffect(() => {
    refreshWorkspaceContent();
  }, [refreshWorkspaceContent]);

  function getAbstractPlatformAPI(): AbstractPlatformAPI {
    const platform = getPlatform();

    if (platform === PlatformEnum.Capacitor) {
      // return new CapacitorAPI();
      return new CloudAPI(workspace);
    } else if (platform === PlatformEnum.Electron) {
      return new ElectronAPI();
    } else if (
      platform === PlatformEnum.Web ||
      platform === PlatformEnum.WebMobile
    ) {
      return new CloudAPI(workspace);
    } else if (platform === PlatformEnum.VSCode) {
      // platformApi.current = new VSCodeAPI();
      throw new Error("VSCode API not implemented");
    } else {
      throw new Error("Unknown platform");
    }
  }

  return {
    platformApi,
    refreshWorkspaceContent,
  };
}
