import { Button, Modal, ModalContent } from "@heroui/react";
import Icon from "../misc/icon";

export default function ModalWrapper({
  children,
  isOpen,
  onClose,
  title,
  isShowGoBack,
  goBackCallback,
  placement = undefined,
}: {
  children?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isShowGoBack?: boolean;
  goBackCallback?: () => void;
  placement?:
    | "center"
    | "bottom"
    | "top"
    | "auto"
    | "top-center"
    | "bottom-center"
    | undefined;
}) {
  return (
    <Modal
      isOpen={isOpen}
      backdrop="opaque"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
      onClose={() => {
        onClose();
      }}
      isDismissable={false}
      placement={placement}
    >
      <ModalContent>
        <div className="grid h-fit w-full grid-rows-[max-content_1fr]">
          {isShowGoBack && (
            <Button
              className="text-foreground-500 absolute top-1 left-1 rounded-full"
              isIconOnly
              onPress={goBackCallback}
              size="sm"
              variant="light"
            >
              <Icon name="arrow_back" className="text-[18px]!" />
            </Button>
          )}

          <div className="h-full w-full pt-8">
            <div className="grid h-full max-h-[70vh] grid-rows-[max-content_1fr] px-1 pb-4">
              <p className="pb-4 text-center text-lg font-bold">{title}</p>
              <div className="h-full max-h-full min-h-0 w-full overflow-y-auto px-1">
                {children}
              </div>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
