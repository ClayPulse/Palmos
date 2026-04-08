import { useTranslations } from "@/lib/hooks/use-translations";
import { Button } from "@heroui/react";
import ModalWrapper from "./wrapper";
import Icon from "../misc/icon";

export default function ImportWorkflowModal({
  isOpen,
  onClose,
  onSelectNewTab,
  onSelectCurrentCanvas,
  isCurrentTabCanvas,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewTab: () => void;
  onSelectCurrentCanvas: () => void;
  isCurrentTabCanvas?: boolean;
}) {
  const { getTranslations: t } = useTranslations();

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={t("viewMenu.importWorkflow.title")}
    >
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-foreground-500 text-center text-sm">
          {t("viewMenu.importWorkflow.chooseDestination")}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            className="h-auto w-full justify-start gap-3 px-4 py-3"
            variant="flat"
            onPress={onSelectNewTab}
          >
            <Icon name="tab" className="text-[20px]" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {t("viewMenu.importWorkflow.newTab")}
              </span>
              <span className="text-foreground-500 text-xs">
                {t("viewMenu.importWorkflow.newTabDescription")}
              </span>
            </div>
          </Button>
          <Button
            className="h-auto w-full justify-start gap-3 px-4 py-3"
            variant="flat"
            isDisabled={!isCurrentTabCanvas}
            onPress={onSelectCurrentCanvas}
          >
            <Icon name="dashboard" className="text-[20px]" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {t("viewMenu.importWorkflow.currentCanvas")}
              </span>
              <span className="text-foreground-500 text-xs">
                {t("viewMenu.importWorkflow.currentCanvasDescription")}
              </span>
            </div>
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
