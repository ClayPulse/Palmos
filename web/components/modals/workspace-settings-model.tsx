"use client";

import { Button, Input, Select, SelectItem, Switch } from "@heroui/react";
import ModalWrapper from "./modal-wrapper";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { RemoteWorkspace } from "@/lib/types";
import { useWorkspace } from "@/lib/hooks/use-workspace";

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
  const { workspace, createWorkspace, updateWorkspace } = workspaceHook;

  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
    }
  }, [workspace]);

  function handleUpdateWorkspace() {
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

    const newWorkspace: RemoteWorkspace = {
      ...workspace,
      name: workspaceName,
    };

    // Update workspace
    updateWorkspace(newWorkspace);
  }

  function handleCreateProject() {
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
    createWorkspace(workspaceName);
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
        <Select label="Workspace Specs" placeholder="Coming soon" isDisabled>
          <SelectItem>Coming soon</SelectItem>
        </Select>
        {workspace ? (
          <Button onPress={handleUpdateWorkspace}>Update</Button>
        ) : (
          <Button onPress={handleCreateProject}>Create</Button>
        )}
      </div>
    </ModalWrapper>
  );
}
