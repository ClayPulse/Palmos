"use client";

import { useProjectManager } from "@/lib/hooks/use-project-manager";
import { ProjectInfo } from "@/lib/types";
import { addToast, Button, Input, Tab, Tabs } from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useEffect, useState } from "react";
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
  const { createProject, updateProject, deleteProject, refreshProjects } =
    useProjectManager();

  const [projectName, setProjectName] = useState("");

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

  async function handleDeleteProject() {
    if (!projectInfo) {
      addToast({
        title: t("projectSettingsModal.toast.noProjectSelected"),
        color: "danger",
      });
      return;
    }

    await deleteProject(projectInfo.name);
    onClose();
    await refreshProjects();
  }

  const isOwner = !projectInfo || projectInfo.role === "owner";

  return (
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
  );
}
