import Loading from "@/components/interface/status-screens/loading";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAbstractPlatformAPI } from "@/lib/platform-api/get-platform-api";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { WorkspaceConfig } from "@/lib/types";
import { Button } from "@heroui/react";
import { useCallback, useContext, useEffect, useRef } from "react";
import useSWR from "swr";
import { useTranslations } from "@/lib/hooks/use-translations";
import FileSystemExplorer from "../file-system/fs-explorer";

export default function WorkspaceExplorer() {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const workspace = editorContext?.editorStates?.currentWorkspace;
  const { platformApi } = usePlatformApi();

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
      const { status }: { status: string } = await res.json();
      return status === "ready";
    },
    { refreshInterval: 5000 },
  );

  const waitUntilRunningResolve = useRef<() => void>(null);

  useEffect(() => {
    if (isWorkspaceHealthy && waitUntilRunningResolve.current) {
      waitUntilRunningResolve.current();
      waitUntilRunningResolve.current = null;
    }
  }, [isWorkspaceHealthy]);

  const waitUntilWorkspaceRunning = useCallback(async () => {
    if (isWorkspaceHealthy) {
      return;
    }
    return new Promise<void>((resolve) => {
      waitUntilRunningResolve.current = resolve;
    });
  }, [isWorkspaceHealthy]);

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
  }

  useEffect(() => {
    async function openProjectInWorkspace() {
      if (!platformApi) {
        return;
      }

      if (getPlatform() === PlatformEnum.Electron && !workspace) {
        await refreshWorkspaceContent();
      } else if (workspace) {
        const homePath = editorContext?.persistSettings?.projectHomePath;
        const projectName = editorContext?.editorStates.project;
        if (!projectName) {
          return;
        }

        await waitUntilWorkspaceRunning();

        const uri = homePath ?? "/workspace";
        const hasPath = await platformApi.hasPath(uri);

        if (!hasPath) {
          await platformApi.createFolder(uri);
        }

        await refreshWorkspaceContent();
      }
    }

    openProjectInWorkspace();
  }, [
    platformApi,
    workspace,
    waitUntilWorkspaceRunning,
  ]);

  async function handleOpenWorkspaceSettingsModal() {
    editorContext?.updateModalStates({
      workspaceSettings: {
        isOpen: true,
        isShowUseButton: true,
        initialWorkspace: workspace,
      },
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      {editorContext?.editorStates.project ? (
        <div className="h-full w-full">
          {getPlatform() === PlatformEnum.Electron ||
          workspace ? (
            !isWorkspaceHealthy &&
              getPlatform() !== PlatformEnum.Electron ? (
              <div className="h-full w-full items-center justify-center">
                <Loading text={t("workspaceExplorer.workspaceStarting")} />
              </div>
            ) : (
              <FileSystemExplorer
                setIsMenuOpen={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isSideMenuOpen: false,
                  }));
                }}
                openWorkspaceSettingsModal={handleOpenWorkspaceSettingsModal}
                refreshWorkspaceContent={refreshWorkspaceContent}
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-y-2 px-4 pb-24">
              {!workspace && (
                <Button onPress={handleOpenWorkspaceSettingsModal}>
                  <Icon name="settings" variant="round" />
                  <p>{t("workspaceExplorer.workspaceSettings")}</p>
                </Button>
              )}

              <p className="text-center">
                {t("workspaceExplorer.osFeatures")}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-4 pb-24">
          <p>
            {t("workspaceExplorer.viewProjectContent")}
          </p>
        </div>
      )}
    </div>
  );
}
