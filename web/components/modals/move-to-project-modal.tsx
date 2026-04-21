"use client";

import Icon from "@/components/misc/icon";
import { useProjectManager } from "@/lib/hooks/use-project-manager";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

export default function MoveToProjectModal({
  isOpen,
  onClose,
  onSelect,
  currentProjectId,
  title = "Move to Organization",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (projectId: string | null) => void;
  currentProjectId?: string | null;
  title?: string;
}) {
  const { projects } = useProjectManager();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-1">
            {/* No project option */}
            <button
              onClick={() => onSelect(null)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                !currentProjectId
                  ? "bg-amber-100/80 dark:bg-amber-500/15"
                  : "hover:bg-default-100 dark:hover:bg-white/5"
              }`}
            >
              <Icon
                name="home"
                variant="round"
                className="shrink-0 text-sm text-default-500"
              />
              <span className="text-sm text-default-700 dark:text-white/80">
                No Organization
              </span>
              {!currentProjectId && (
                <Icon
                  name="check"
                  variant="round"
                  className="ml-auto text-sm text-amber-500"
                />
              )}
            </button>

            {projects?.map((p) => (
              <button
                key={p.id ?? p.name}
                onClick={() => onSelect(p.id ?? null)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  p.id === currentProjectId
                    ? "bg-amber-100/80 dark:bg-amber-500/15"
                    : "hover:bg-default-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon
                  name="folder"
                  variant="round"
                  className={`shrink-0 text-sm ${
                    p.id === currentProjectId
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-default-500"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-default-700 dark:text-white/80">
                  {p.name}
                </span>
                {p.id === currentProjectId && (
                  <Icon
                    name="check"
                    variant="round"
                    className="ml-auto text-sm text-amber-500"
                  />
                )}
              </button>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
