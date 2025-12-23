"use client";

import { PlatformEnum } from "@/lib/enums";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { SpecOption } from "@/lib/types";
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
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./modal-wrapper";

export default function WorkspaceSettingsModal({
  isOpen,
  setIsOpen,
  workspaceHook,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  workspaceHook: ReturnType<typeof useWorkspace>;
}) {
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();
  const {
    workspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectWorkspace,
    cloudWorkspaces,
  } = workspaceHook;

  const [workspaceName, setWorkspaceName] = useState("");
  const [storage, setStorage] = useState(5);
  const [selectedSpec, setSelectedSpec] = useState<SpecOption>(specsOptions[0]);
  const [isCreateNew, setIsCreateNew] = useState(false);

  useEffect(() => {
    if (workspace) {
      console.log("Workspace loaded:", workspace);
      setWorkspaceName(workspace.name);
      setStorage(getNumberFromUnitString(workspace.volumeSize));
      setSelectedSpec(
        specsOptions.find(
          (option) =>
            option.vCPU === getNumberFromUnitString(workspace.cpuLimit) &&
            option.ram === getNumberFromUnitString(workspace.memoryLimit),
        ) ?? specsOptions[0],
      );
    } else {
      setWorkspaceName("");
      setStorage(5);
      setSelectedSpec(specsOptions[0]);
    }
  }, [workspace]);

  async function handleUpdateWorkspace() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    } else if (!workspace) {
      toast.error("Workspace is not available.");
      return;
    } else if (workspaceName === "") {
      toast.error("Workspace Name is required.");
      return;
    }

    // Update workspace
    await updateWorkspace(workspace.id, workspaceName);

    addToast({
      title: "Workspace updated",
      description: `Workspace ${workspaceName} has been updated successfully.`,
      color: "success",
    });
    setIsOpen(false);
  }

  async function handleDeleteWorkspace() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    } else if (!workspace) {
      toast.error("Workspace is not available.");
      return;
    }
    try {
      // Delete workspace
      addToast({
        title: "Deleting workspace",
        description: `Deleting workspace ${workspaceName}`,
      });

      await deleteWorkspace(workspace.id);
      addToast({
        title: "Workspace deleted",
        description: `Workspace ${workspace.name} has been deleted successfully.`,
        color: "success",
      });

      setIsOpen(false);
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
    } else if (workspace) {
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
      setIsOpen(false);
      setIsCreateNew(false);
    } catch (error: any) {
      addToast({
        title: "Error creating workspace",
        description: error.message,
        color: "danger",
      });
    }
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Workspace Settings"
    >
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
              workspace
                ? [workspace.id]
                : getPlatform() === PlatformEnum.Electron
                  ? ["__internal-local"]
                  : []
            }
            size="sm"
            disabledKeys={workspace ? [] : ["settings"]}
            onSelectionChange={async (key) => {
              if (key.currentKey === "__internal-create-new") {
                await selectWorkspace(undefined);
                setIsCreateNew(true);
                return;
              } else if (key.currentKey === "__internal-settings") {
                await selectWorkspace(undefined);
                return;
              } else if (key.currentKey === "__internal-local") {
                await selectWorkspace(undefined);
                return;
              }

              setIsCreateNew(false);

              const selectedWorkspace = cloudWorkspaces?.find(
                (workspace) => workspace.id === key.currentKey,
              );
              await selectWorkspace(selectedWorkspace?.id);
            }}
          >
            <>
              {getPlatform() === PlatformEnum.Electron && (
                <SelectItem key={"__internal-local"}>Local Computer</SelectItem>
              )}
              {cloudWorkspaces?.map((workspace) => (
                <SelectItem key={workspace.id}>{workspace.name}</SelectItem>
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

        {(isCreateNew || workspace) && (
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
              isDisabled={workspace ? true : false}
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
              isDisabled={workspace ? true : false}
            />
            {workspace ? (
              <div className="flex gap-x-1">
                <Button onPress={handleUpdateWorkspace}>Update</Button>

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
