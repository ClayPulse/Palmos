import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext } from "react";
import { AppInfoModalContent } from "../types";

export function useAppInfo() {
  const editorContext = useContext(EditorContext);

  function openAppInfoModal(content: AppInfoModalContent) {
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isAppInfoModalOpen: true,
      appInfoModalContent: content,
    }));
  }

  return {
    openAppInfoModal,
  };
}
