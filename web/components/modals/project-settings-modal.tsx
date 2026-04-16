"use client";

import Icon from "@/components/misc/icon";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectInfo } from "@/lib/types";
import {
  addToast,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useContext, useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { EditorContext } from "@/components/providers/editor-context-provider";
import ModalWrapper from "./wrapper";
import ProjectMembers from "../explorer/project/project-members";

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  projectInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectInfo?: ProjectInfo;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);
  const { mutate: globalMutate } = useSWRConfig();
  const { createProject, updateProject, deleteProject, refreshProjects } =
    useProjectManager();
  const { workflows } = useMarketplaceWorkflows(
    projectInfo?.id ? "My Workflows" : "All",
    projectInfo?.id ?? undefined,
  );

  const [projectName, setProjectName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (projectInfo) {
      setProjectName(projectInfo.name);
    }
  }, [projectInfo]);

  async function handleUpdateProject() {
    if (!projectInfo) {
      addToast({
        title: t("projectSettingsModal.toast.noProjectSelected"),
        color: "danger",
      });
      return;
    }

    await updateProject(projectInfo.name, { name: projectName });
    onClose();
    await refreshProjects();
  }

  async function handleCreateProject() {
    await createProject({ name: projectName });
    onClose();
    await refreshProjects();
  }

  function handleDeleteProject() {
    if (!projectInfo) {
      addToast({
        title: t("projectSettingsModal.toast.noProjectSelected"),
        color: "danger",
      });
      return;
    }

    const workflowCount = workflows?.length ?? 0;
    if (workflowCount > 0) {
      setShowDeleteConfirm(true);
    } else {
      confirmDelete(false);
    }
  }

  async function confirmDelete(deleteWorkflows: boolean) {
    if (!projectInfo) return;
    setShowDeleteConfirm(false);
    // 1. Delete project (workflows are either deleted or unlinked)
    await deleteProject(projectInfo.name, deleteWorkflows);
    // 2. Switch to no-project view
    editorContext?.setEditorStates((prev) => ({ ...prev, project: undefined }));
    onClose();
    // 3. Refresh project list and workflow list so unlinked workflows appear
    await refreshProjects();
    // Small delay to let the home screen mount before mutating its SWR key
    setTimeout(() => globalMutate("/api/user-workflows/list"), 100);
  }

  const isOwner = !projectInfo || projectInfo.role === "owner";

  return (
    <>
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t("projectSettingsModal.title")}
    >
      {projectInfo?.id ? (
        <Tabs aria-label="Project settings" className="w-full px-4 pt-2">
          <Tab key="general" title="General">
            <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
              <Input
                label={t("projectSettingsModal.projectName")}
                isRequired
                value={projectName}
                onValueChange={setProjectName}
                isDisabled={!isOwner}
              />
              <div className="flex gap-x-2">
                {isOwner && (
                  <>
                    <Button onPress={handleUpdateProject}>
                      {t("common.update")}
                    </Button>
                    <Button onPress={handleDeleteProject} color="danger">
                      {t("common.delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Tab>
          <Tab key="members" title="Members">
            <div className="p-4">
              <ProjectMembers
                projectId={projectInfo.id}
                isOwner={isOwner}
              />
            </div>
          </Tab>
        </Tabs>
      ) : (
        <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
          <Input
            label={t("projectSettingsModal.projectName")}
            isRequired
            value={projectName}
            onValueChange={setProjectName}
          />
          <div className="flex gap-x-2">
            <Button onPress={handleCreateProject} color="primary">
              {t("common.create")}
            </Button>
          </div>
        </div>
      )}
    </ModalWrapper>
    <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} size="sm">
      <ModalContent>
        <ModalHeader className="flex items-center gap-x-2">
          <Icon name="warning" className="text-warning" />
          Delete Project
        </ModalHeader>
        <ModalBody>
          <p className="text-sm">
            This project contains <strong>{workflows?.length ?? 0} workflow{(workflows?.length ?? 0) !== 1 ? "s" : ""}</strong>. What would you like to do with them?
          </p>
        </ModalBody>
        <ModalFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="flat"
            onPress={() => confirmDelete(false)}
            startContent={<Icon name="drive_file_move" />}
            className="w-full sm:w-auto"
          >
            Keep Workflows
          </Button>
          <Button
            color="danger"
            onPress={() => confirmDelete(true)}
            startContent={<Icon name="delete" />}
            className="w-full sm:w-auto"
          >
            Delete Everything
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}
