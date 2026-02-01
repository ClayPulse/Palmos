import Loading from "@/components/interface/status-screens/loading";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { addToast, Button } from "@heroui/react";
import { useContext, useEffect } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";
import FileSystemExplorer from "../file-system/fs-explorer";

export default function WorkspaceExplorer() {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const workspaceHook = useWorkspace();
  const { platformApi } = usePlatformApi();
  const { refreshWorkspaceContent, isWorkspaceHealthy } = useWorkspace();

  useEffect(() => {
    async function openProjectInWorkspace() {
      if (!platformApi) {
        return;
      }

      if (getPlatform() === PlatformEnum.Electron && !workspaceHook.workspace) {
        await refreshWorkspaceContent();
      } else if (workspaceHook.workspace) {
        const homePath = editorContext?.persistSettings?.projectHomePath;
        const projectName = editorContext?.editorStates.project;
        if (!projectName) {
          return;
        }

        await workspaceHook.waitUntilWorkspaceRunning();

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
    workspaceHook.workspace,
    workspaceHook.waitUntilWorkspaceRunning,
  ]);

  async function handleOpenWorkspaceSettingsModal() {
    console.log(workspaceHook.workspace);

    editorContext?.updateModalStates({
      workspaceSettings: {
        isOpen: true,
        isShowUseButton: true,
        initialWorkspace: workspaceHook.workspace,
      },
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      {editorContext?.editorStates.project ? (
        <div className="h-full w-full">
          {getPlatform() === PlatformEnum.Electron ||
          workspaceHook.workspace ? (
            workspaceHook.workspace?.status === "paused" ? (
              <div className="flex h-full flex-col items-center justify-center px-4 pb-24 gap-y-1">
                <p className="text-center">
                  {t("workspaceExplorer.workspacePaused")}
                </p>
                <Button
                  onPress={async () => {
                    if (!workspaceHook.workspace) {
                      addToast({
                        title: t("workspaceExplorer.toast.noWorkspace"),
                        color: "danger",
                      });
                      return;
                    }

                    addToast({
                      title: t("workspaceExplorer.toast.startingWorkspace"),
                    });
                    await workspaceHook.startWorkspace(
                      workspaceHook.workspace.id,
                    );
                    addToast({
                      title: t("workspaceExplorer.toast.workspaceStarted"),
                      color: "success",
                    });
                    await refreshWorkspaceContent();
                  }}
                >
                  {t("workspaceExplorer.startWorkspace")}
                </Button>
                <Button onPress={handleOpenWorkspaceSettingsModal}>
                  <Icon name="settings" variant="round" />
                  <p>{t("workspaceExplorer.workspaceSettings")}</p>
                </Button>
              </div>
            ) : !isWorkspaceHealthy &&
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
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-y-2 px-4 pb-24">
              {!workspaceHook.workspace && (
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
