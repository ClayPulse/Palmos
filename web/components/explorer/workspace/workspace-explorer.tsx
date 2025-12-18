import Loading from "@/components/interface/status-screens/loading";
import Icon from "@/components/misc/icon";
import WorkspaceSettingsModal from "@/components/modals/workspace-settings-model";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { Button } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import FileSystemExplorer from "../file-system/fs-explorer";

export default function WorkspaceExplorer() {
  const editorContext = useContext(EditorContext);

  const workspaceHook = useWorkspace();
  const { platformApi } = usePlatformApi();
  const { refreshWorkspaceContent, isWorkspaceRunning } = useWorkspace();

  const [isWorkspaceSettingsModalOpen, setIsWorkspaceSettingsModalOpen] =
    useState(false);

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

  return (
    <div className="flex h-full w-full flex-col">
      {editorContext?.editorStates.project ? (
        <div className="h-full w-full">
          {getPlatform() === PlatformEnum.Electron ||
          workspaceHook.workspace ? (
            !isWorkspaceRunning && getPlatform() !== PlatformEnum.Electron ? (
              <div className="h-full w-full items-center justify-center">
                <Loading text="Workspace is starting..."/>
              </div>
            ) : (
              <FileSystemExplorer
                setIsMenuOpen={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isSideMenuOpen: false,
                  }));
                }}
                openWorkspaceSettingsModal={() => {
                  setIsWorkspaceSettingsModalOpen(true);
                }}
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-y-2 px-4 pb-24">
              {!workspaceHook.workspace && (
                <Button onPress={() => setIsWorkspaceSettingsModalOpen(true)}>
                  <Icon name="settings" variant="round" />
                  <p>Workspace Settings</p>
                </Button>
              )}

              <p className="text-center">
                  To interact with OS features, please open in desktop client
                  or configure a remote workspace.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-4 pb-24">
          <p>
            To view project content in workspace, please select a project first.
          </p>
        </div>
      )}

      {isWorkspaceSettingsModalOpen && (
        <WorkspaceSettingsModal
          isOpen={isWorkspaceSettingsModalOpen}
          setIsOpen={setIsWorkspaceSettingsModalOpen}
          workspaceHook={workspaceHook}
        />
      )}
    </div>
  );
}
