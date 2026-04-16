"use client";

import Icon from "@/components/misc/icon";
import WorkflowUserSettings from "@/components/interface/workflow-user-settings";
import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";

export default function WorkflowSettingsModal({
  workflowId,
  isOpen,
  onClose,
}: {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-x-2">
          <Icon name="tune" className="text-primary" />
          Workflow Settings
        </ModalHeader>
        <ModalBody>
          <Divider />
          <WorkflowUserSettings workflowId={workflowId} />
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
