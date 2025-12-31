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
      toast.error("Unknown platform.");
      return;
    } else if (!selectedWorkspace) {
      toast.error("Workspace is not available.");
      return;
    } else if (workspaceName === "") {
      toast.error("Workspace Name is required.");
      return;
    }

    // Update workspace
    addToast({
      title: "Updating workspace",
      description: `Updating workspace ${workspaceName}.`,
    });

    await updateWorkspace(selectedWorkspace.id, workspaceName);

    addToast({
      title: "Workspace updated",
      description: `Workspace ${workspaceName} has been updated successfully.`,
      color: "success",
    });
    onClose();
  }

  async function handleDeleteWorkspace() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    } else if (!selectedWorkspace) {
      toast.error("Workspace is not available.");
      return;
    }
    try {
      // Delete workspace
      addToast({
        title: "Deleting workspace",
        description: `Deleting workspace ${workspaceName}`,
      });

      await deleteWorkspace(selectedWorkspace.id);
      addToast({
        title: "Workspace deleted",
        description: `Workspace ${selectedWorkspace.name} has been deleted successfully.`,
        color: "success",
      });

      onClose();
    } catch (error: any) {
      addToast({
        title: "Error deleting workspace",
        description: error.message,
        color: "danger",
      });
    }
  }

  async function handleCreateWorkspace() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    } else if (selectedWorkspace) {
      toast.error("Workspace already exists. Please update it instead.");
      return;
    } else if (workspaceName === "") {
      toast.error("Workspace Name is required.");
      return;
    }

    // Create workspace
    try {
      const specs = selectedSpec.key;
      const volumeSize = getUnitFromUnitString(storage.toString(), "Gi");

      addToast({
        title: "Creating workspace",
        description: `Creating workspace ${workspaceName}. Specifications: ${
          selectedSpec.vCPU
        } vCPU, ${selectedSpec.ram} RAM, ${volumeSize} storage.`,
      });
      await createWorkspace(workspaceName, specs, volumeSize);
      addToast({
        title: "Workspace created",
        description: `Workspace ${workspaceName} has been created successfully.`,
        color: "success",
      });
      onClose();
      setIsCreateNew(false);
    } catch (error: any) {
      addToast({
        title: "Error creating workspace",
        description: error.message,
        color: "danger",
      });
    }
  }

  async function handleStopWorkspace() {
    if (!selectedWorkspace) {
      toast.error("Workspace is not available.");
      return;
    }
    addToast({
      title: "Stopping workspace",
      description: `Stopping workspace ${selectedWorkspace.name}.`,
    });
    await stopWorkspace(selectedWorkspace.id);
    addToast({
      title: "Workspace stopped",
      description: `Workspace ${selectedWorkspace.name} has been stopped successfully.`,
      color: "success",
    });
  }

  async function handleResumeWorkspace() {
    if (!selectedWorkspace) {
      toast.error("Workspace is not available.");
      return;
    }
    addToast({
      title: "Starting workspace",
      description: `Starting workspace ${selectedWorkspace.name}.`,
    });
    await startWorkspace(selectedWorkspace.id);
    addToast({
      title: "Workspace started",
      description: `Workspace ${selectedWorkspace.name} has been started successfully.`,
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Workspace Settings">
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <div className="flex w-full justify-center px-8">
          <Select
            color="default"
            className="w-full"
            classNames={{
              mainWrapper: "h-10",
              trigger: "py-0.5 min-h-10",
            }}
            label="Select Workspace"
            placeholder="Select Workspace"
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
                <SelectItem key={"__internal-local"}>Local Computer</SelectItem>
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
                Create New
              </SelectItem>
            </>
          </Select>
        </div>

        {(isCreateNew || selectedWorkspace) && (
          <>
            <Divider />
            <Input
              label="Workspace Name"
              isRequired
              value={workspaceName}
              onValueChange={setWorkspaceName}
            />
            <Select
              label="Workspace Specs"
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
                  <p className="pl-5 text-center">More to come</p>
                </SelectItem>
              </>
            </Select>
            <NumberInput
              label="Storage (GB)"
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
                      Exit Workspace
                    </Button>
                  ) : (
                    <Button onPress={handleUseWorkspace}>Use Workspace</Button>
                  ))}

                {isEdited && (
                  <Button onPress={handleUpdateWorkspace}>Update</Button>
                )}

                {isWorkspaceRunning ? (
                  <Button onPress={handleStopWorkspace} color="warning">
                    Stop
                  </Button>
                ) : (
                  <Button onPress={handleResumeWorkspace} color="primary">
                    Start
                  </Button>
                )}

                <Button color="danger" onPress={handleDeleteWorkspace}>
                  Delete
                </Button>
              </div>
            ) : (
              <Button onPress={handleCreateWorkspace}>Create</Button>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  );
}
