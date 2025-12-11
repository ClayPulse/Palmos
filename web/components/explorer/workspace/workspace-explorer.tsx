import Icon from "@/components/misc/icon";
import WorkspaceSettingsModal from "@/components/modals/workspace-settings-model";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { Select, SelectItem } from "@heroui/react";
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
          <div className="flex justify-center px-4">
            <Select
              color="default"
              className="w-full"
              classNames={{
                mainWrapper: "h-10",
                trigger: "py-0.5 min-h-10",
              }}
              label="Workspace"
              placeholder="Select Workspace"
              isLoading={
                !editorContext?.editorStates?.isSigningIn &&
                !workspaceHook.cloudWorkspaces
              }
              selectedKeys={
                workspaceHook.workspace
                  ? [workspaceHook.workspace.id]
                  : getPlatform() === PlatformEnum.Electron
                    ? ["__internal-local"]
                    : []
              }
              size="sm"
              disabledKeys={workspaceHook.workspace ? [] : ["settings"]}
              onSelectionChange={async (key) => {
                if (
                  key.currentKey === "__internal-create-new" ||
                  key.currentKey === "__internal-settings"
                ) {
                  return;
                } else if (key.currentKey === "__internal-local") {
                  await workspaceHook.selectWorkspace(undefined);
                  return;
                }

                const selectedWorkspace = workspaceHook.cloudWorkspaces?.find(
                  (workspace) => workspace.id === key.currentKey,
                );
                await workspaceHook.selectWorkspace(selectedWorkspace?.id);
              }}
            >
              <>
                {getPlatform() === PlatformEnum.Electron && (
                  <SelectItem key={"__internal-local"}>
                    Local Computer
                  </SelectItem>
                )}
                {workspaceHook.cloudWorkspaces?.map((workspace) => (
                  <SelectItem key={workspace.id}>{workspace.name}</SelectItem>
                )) ?? []}
                <SelectItem
                  key={"__internal-create-new"}
                  className="bg-primary text-primary-foreground"
                  color="primary"
                  onPress={() => {
                    setIsWorkspaceSettingsModalOpen(true);
                  }}
                  startContent={
                    <div className="text-primary-foreground h-4 w-4">
                      <Icon name="add" variant="round" />
                    </div>
                  }
                >
                  Create New
                </SelectItem>
                <SelectItem
                  key={"__internal-settings"}
                  className="bg-default"
                  onPress={() => {
                    setIsWorkspaceSettingsModalOpen(true);
                  }}
                  startContent={
                    <div className="h-4 w-4">
                      <Icon name="settings" variant="round" />
                    </div>
                  }
                >
                  Settings
                </SelectItem>
              </>
            </Select>
          </div>
          {getPlatform() === PlatformEnum.Electron ||
          workspaceHook.workspace ? (
            !isWorkspaceRunning && getPlatform() !== PlatformEnum.Electron ? (
              <div>Workspace is starting</div>
            ) : (
              <FileSystemExplorer
                setIsMenuOpen={() => {
                  editorContext?.setEditorStates((prev) => ({
                    ...prev,
                    isSideMenuOpen: false,
                  }));
                }}
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-4 pb-24">
              <p>
                To browse files in workspace, please open in desktop client or
                select remote workspace.
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
