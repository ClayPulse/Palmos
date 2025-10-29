"use client";

import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { useWorkspace } from "@/lib/hooks/use-workspace";
import {
  addToast,
  Button,
  Input,
  NumberInput,
  Select,
  SelectItem,
} from "@heroui/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ModalWrapper from "./modal-wrapper";

const specsOptions = [
  { key: "cpu-1-2", vCPU: 1, ram: 2 },
  { key: "cpu-2-4", vCPU: 2, ram: 4 },
  { key: "cpu-4-8", vCPU: 4, ram: 8 },
];

function getNumberFromUnitString(value: string) {
  // Assumes the value is in the format "10Gi", "512Mi", etc.
  return parseInt(value.replace(/\D/g, ""));
}

function getUnitFromUnitString(value: string, unit: string) {
  return `${value}${unit}`;
}

export default function WorkspaceSettingsModal({
  isOpen,
  setIsOpen,
  workspaceHook,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  workspaceHook: ReturnType<typeof useWorkspace>;
}) {
  const { platformApi } = usePlatformApi();
  const [workspaceName, setWorkspaceName] = useState("");
  const { workspace, createWorkspace, updateWorkspace, deleteWorkspace } =
    workspaceHook;

  const [storage, setStorage] = useState(5);
  const [selectedSpec, setSelectedSpec] = useState(specsOptions[0]);

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
      toast.error("Project Name is required.");
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

  async function handleCreateProject() {
    if (!platformApi) {
      toast.error("Unknown platform.");
      return;
    } else if (workspace) {
      toast.error("Workspace already exists. Please update it instead.");
      return;
    } else if (workspaceName === "") {
      toast.error("Project Name is required.");
      return;
    }

    // Create workspace
    try {
      const vCPU = selectedSpec.vCPU.toString();
      const ram = getUnitFromUnitString(selectedSpec.ram.toString(), "Gi");
      const volumeSize = getUnitFromUnitString(storage.toString(), "Gi");

      addToast({
        title: "Creating workspace",
        description: `Creating workspace ${workspaceName}. Specifications: ${vCPU} vCPU, ${ram} RAM, ${volumeSize} storage.`,
      });
      await createWorkspace(workspaceName, vCPU.toString(), ram, volumeSize);
      addToast({
        title: "Workspace created",
        description: `Workspace ${workspaceName} has been created successfully.`,
        color: "success",
      });
      setIsOpen(false);
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
          <Button onPress={handleCreateProject}>Create</Button>
        )}
      </div>
    </ModalWrapper>
  );
}
