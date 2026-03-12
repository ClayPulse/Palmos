"use client";

import { useTranslations } from "@/lib/hooks/use-translations";
import { Button, Textarea } from "@heroui/react";
import { useContext } from "react";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";
export default function NodeNoteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);

  const note = editorContext?.editorStates.modalStates?.nodeNote;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t("nodeNoteModal.title")}>
      <Textarea
        placeholder={t("nodeNoteModal.placeholder")}
        defaultValue={note?.note ?? ""}
        onChange={(e) => {
          note?.setNote?.(e.currentTarget.value);
        }}
      />

      <Button onPress={onClose} className="mt-2 w-full" color="primary">
        {t("nodeNoteModal.save")}
      </Button>
    </ModalWrapper>
  );
}
