"use client";

import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { SpecOption, WorkspaceConfig } from "@/lib/types";
import {
  getNumberFromUnitString,
  getUnitFromUnitString,
  specsOptions,
} from "@/lib/workspace/specs";
import {
  addToast,
  Button,
  Divider,
  Input,
  NumberInput,
  Select,
  SelectItem,
} from "@heroui/react";
import { useTranslations } from "next-intl";
import { useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function WorkspaceSettingsModal({
  isOpen,
  onClose,
  initialWorkspace,
  isShowUseButton = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialWorkspace?: WorkspaceConfig;
  isShowUseButton?: boolean;
}) {
  const t = useTranslations();
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();
  const {
    // workspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    startWorkspace,
    stopWorkspace,
    cloudWorkspaces,
  } = useWorkspace();

  const [workspaceName, setWorkspaceName] = useState("");
  const [storage, setStorage] = useState(5);
  const [selectedSpec, setSelectedSpec] = useState<SpecOption>(specsOptions[0]);
  const [isCreateNew, setIsCreateNew] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    WorkspaceConfig | undefined
  >(initialWorkspace);

  const isWorkspaceRunning = useMemo(() => {
    return (
      cloudWorkspaces?.some(
        (ws) => ws.id === selectedWorkspace?.id && ws.status === "running",
      ) ?? false
    );
  }, [selectedWorkspace, cloudWorkspaces]);

  const isEdited = useMemo(() => {
    return workspaceName !== selectedWorkspace?.name;
  }, [workspaceName]);

  const isWorkspaceCurrentlyOpen = useMemo(() => {
    return (
      editorContext?.editorStates.currentWorkspace?.id === selectedWorkspace?.id
    );
  }, [selectedWorkspace, editorContext?.editorStates.currentWorkspace]);

  useEffect(() => {
    console.log("initialWorkspace", initialWorkspace);

    if (selectedWorkspace) {
      setWorkspaceName(selectedWorkspace.name);
      setStorage(getNumberFromUnitString(selectedWorkspace.volumeSize));
      setSelectedSpec(
        specsOptions.find(
          (option) =>
            option.vCPU ===
              getNumberFromUnitString(selectedWorkspace.cpuLimit) &&
            option.ram ===
              getNumberFromUnitString(selectedWorkspace.memoryLimit),
        ) ?? specsOptions[0],
      );
    } else {
      setWorkspaceName("");
      setStorage(5);
      setSelectedSpec(specsOptions[0]);
    }
  }, [selectedWorkspace]);

  async function handleUpdateWorkspace() {
    if (!platformApi) {
      toast.error(t("workspaceSettingsModal.toast.unknownPlatform"));
      return;
    } else if (!selectedWorkspace) {
      toast.error(t("workspaceSettingsModal.toast.workspaceNotAvailable"));
      return;
    } else if (workspaceName === "") {
      toast.error(t("workspaceSettingsModal.toast.workspaceNameRequired"));
      return;
    }

    // Update workspace
    addToast({
      title: t("workspaceSettingsModal.toast.updatingWorkspace.title"),
      description: t("workspaceSettingsModal.toast.updatingWorkspace.description", { name: workspaceName }),
    });

    await updateWorkspace(selectedWorkspace.id, workspaceName);

    addToast({
      title: t("workspaceSettingsModal.toast.workspaceUpdated.title"),
      description: t("workspaceSettingsModal.toast.workspaceUpdated.description", { name: workspaceName }),
      color: "success",
    });
    onClose();
  }

  async function handleDeleteWorkspace() {
    if (!platformApi) {
      toast.error(t("workspaceSettingsModal.toast.unknownPlatform"));
      return;
    } else if (!selectedWorkspace) {
      toast.error(t("workspaceSettingsModal.toast.workspaceNotAvailable"));
      return;
    }
    try {
      // Delete workspace
      addToast({
        title: t("workspaceSettingsModal.toast.deletingWorkspace.title"),
        description: t("workspaceSettingsModal.toast.deletingWorkspace.description", { name: workspaceName }),
      });

      await deleteWorkspace(selectedWorkspace.id);
      addToast({
        title: t("workspaceSettingsModal.toast.workspaceDeleted.title"),
        description: t("workspaceSettingsModal.toast.workspaceDeleted.description", { name: selectedWorkspace.name }),
        color: "success",
      });

      onClose();
    } catch (error: any) {
      addToast({
        title: t("workspaceSettingsModal.toast.errorDeleting.title"),
        description: error.message,
        color: "danger",
      });
    }
  }

  async function handleCreateWorkspace() {
    if (!platformApi) {
      toast.error(t("workspaceSettingsModal.toast.unknownPlatform"));
      return;
    } else if (selectedWorkspace) {
      toast.error(t("workspaceSettingsModal.toast.workspaceExists"));
      return;
    } else if (workspaceName === "") {
      toast.error(t("workspaceSettingsModal.toast.workspaceNameRequired"));
      return;
    }

    // Create workspace
    try {
      const specs = selectedSpec.key;
      const volumeSize = getUnitFromUnitString(storage.toString(), "Gi");

      addToast({
        title: t("workspaceSettingsModal.toast.creatingWorkspace.title"),
        description: t("workspaceSettingsModal.toast.creatingWorkspace.description", {
          name: workspaceName,
          cpu: selectedSpec.vCPU,
          ram: selectedSpec.ram,
          storage: volumeSize
        }),
      });
      await createWorkspace(workspaceName, specs, volumeSize);
      addToast({
        title: t("workspaceSettingsModal.toast.workspaceCreated.title"),
        description: t("workspaceSettingsModal.toast.workspaceCreated.description", { name: workspaceName }),
        color: "success",
      });
      onClose();
      setIsCreateNew(false);
    } catch (error: any) {
      addToast({
        title: t("workspaceSettingsModal.toast.errorCreating.title"),
        description: error.message,
        color: "danger",
      });
    }
  }

  async function handleStopWorkspace() {
    if (!selectedWorkspace) {
      toast.error(t("workspaceSettingsModal.toast.workspaceNotAvailable"));
      return;
    }
    addToast({
      title: t("workspaceSettingsModal.toast.stoppingWorkspace.title"),
      description: t("workspaceSettingsModal.toast.stoppingWorkspace.description", { name: selectedWorkspace.name }),
    });
    await stopWorkspace(selectedWorkspace.id);
    addToast({
      title: t("workspaceSettingsModal.toast.workspaceStopped.title"),
      description: t("workspaceSettingsModal.toast.workspaceStopped.description", { name: selectedWorkspace.name }),
      color: "success",
    });
  }

  async function handleResumeWorkspace() {
    if (!selectedWorkspace) {
      toast.error(t("workspaceSettingsModal.toast.workspaceNotAvailable"));
      return;
    }
    addToast({
      title: t("workspaceSettingsModal.toast.startingWorkspace.title"),
      description: t("workspaceSettingsModal.toast.startingWorkspace.description", { name: selectedWorkspace.name }),
    });
    await startWorkspace(selectedWorkspace.id);
    addToast({
      title: t("workspaceSettingsModal.toast.workspaceStarted.title"),
      description: t("workspaceSettingsModal.toast.workspaceStarted.description", { name: selectedWorkspace.name }),
      color: "success",
    });
  }

  async function handleUseWorkspace() {
    if (!selectedWorkspace) {
      toast.error("Workspace is not available.");
      return;
    }

    await selectWorkspace(selectedWorkspace.id);
    onClose();
  }

  async function handleExitWorkspace() {
    await selectWorkspace(undefined);
    onClose();
  }

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t("workspaceSettingsModal.title")}>
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <div className="flex w-full justify-center px-8">
          <Select
            color="default"
            className="w-full"
            classNames={{
              mainWrapper: "h-10",
              trigger: "py-0.5 min-h-10",
            }}
            label={t("workspaceSettingsModal.selectWorkspace")}
            placeholder={t("workspaceSettingsModal.selectWorkspace")}
            isLoading={
              !editorContext?.editorStates?.isSigningIn && !cloudWorkspaces
            }
            selectedKeys={
              selectedWorkspace
                ? [selectedWorkspace.id]
                : getPlatform() === PlatformEnum.Electron
                  ? ["__internal-local"]
                  : []
            }
            size="sm"
            disabledKeys={selectedWorkspace ? [] : ["settings"]}
            onSelectionChange={async (key) => {
              if (key.currentKey === "__internal-create-new") {
                setIsCreateNew(true);
                setSelectedWorkspace(undefined);
                return;
              } else if (key.currentKey === "__internal-settings") {
                return;
              } else if (key.currentKey === "__internal-local") {
                return;
              }

              setIsCreateNew(false);

              setSelectedWorkspace(
                cloudWorkspaces?.find((ws) => ws.id === key.currentKey),
              );
            }}
          >
            <>
              {getPlatform() === PlatformEnum.Electron && (
                <SelectItem key={"__internal-local"}>{t("workspaceSettingsModal.localComputer")}</SelectItem>
              )}
              {cloudWorkspaces?.map((ws) => (
                <SelectItem key={ws.id}>{ws.name}</SelectItem>
              )) ?? []}
              <SelectItem
                key={"__internal-create-new"}
                className="bg-primary text-primary-foreground"
                color="primary"
                startContent={
                  <div className="text-primary-foreground h-4 w-4">
                    <Icon name="add" variant="round" />
                  </div>
                }
              >
                {t("workspaceSettingsModal.createNew")}
              </SelectItem>
            </>
          </Select>
        </div>

        {(isCreateNew || selectedWorkspace) && (
          <>
            <Divider />
            <Input
              label={t("workspaceSettingsModal.workspaceName")}
              isRequired
              value={workspaceName}
              onValueChange={setWorkspaceName}
            />
            <Select
              label={t("workspaceSettingsModal.workspaceSpecs")}
              selectedKeys={[selectedSpec.key]}
              onSelectionChange={(key) => {
                const spec = specsOptions.find(
                  (option) => option.key === key.currentKey,
                );
                if (spec) {
                  setSelectedSpec(spec);
                }
              }}
              disabledKeys={["more to come"]}
              isDisabled={selectedWorkspace ? true : false}
            >
              <>
                {specsOptions.map((option) => (
                  <SelectItem
                    key={option.key}
                  >{`${option.vCPU} vCPU, ${option.ram} GB RAM`}</SelectItem>
                ))}
                <SelectItem isReadOnly key={"more to come"}>
                  <p className="pl-5 text-center">{t("workspaceSettingsModal.moreToCome")}</p>
                </SelectItem>
              </>
            </Select>
            <NumberInput
              label={t("workspaceSettingsModal.storageGB")}
              value={storage}
              onValueChange={setStorage}
              minValue={2}
              maxValue={512}
              isDisabled={selectedWorkspace ? true : false}
            />
            {selectedWorkspace ? (
              <div className="flex gap-x-1">
                {isShowUseButton &&
                  (isWorkspaceCurrentlyOpen ? (
                    <Button onPress={handleExitWorkspace}>
                      {t("workspaceSettingsModal.exitWorkspace")}
                    </Button>
                  ) : (
                    <Button onPress={handleUseWorkspace}>{t("workspaceSettingsModal.useWorkspace")}</Button>
                  ))}

                {isEdited && (
                  <Button onPress={handleUpdateWorkspace}>{t("common.update")}</Button>
                )}

                {isWorkspaceRunning ? (
                  <Button onPress={handleStopWorkspace} color="warning">
                    {t("workspaceSettingsModal.stop")}
                  </Button>
                ) : (
                  <Button onPress={handleResumeWorkspace} color="primary">
                    {t("workspaceSettingsModal.start")}
                  </Button>
                )}

                <Button color="danger" onPress={handleDeleteWorkspace}>
                  {t("common.delete")}
                </Button>
              </div>
            ) : (
              <Button onPress={handleCreateWorkspace}>{t("common.create")}</Button>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  );
}
