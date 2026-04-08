"use client";

import { WorkspaceConfig } from "@/lib/types";
import { useTranslations } from "@/lib/hooks/use-translations";
import ModalWrapper from "./wrapper";

/**
 * Cloud workspace management has been deprecated.
 * This modal is kept as a stub so existing `updateModalStates` calls
 * that open it do not crash.
 */
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
  const { getTranslations: t } = useTranslations();

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t("workspaceSettingsModal.title")}>
      <div className="flex h-full w-full flex-col items-center space-y-4 p-4">
        <p className="text-center">
          Cloud workspace management has been deprecated.
        </p>
      </div>
    </ModalWrapper>
  );
}
