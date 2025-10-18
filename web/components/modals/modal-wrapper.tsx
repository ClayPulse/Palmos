import { Button, Modal, ModalContent } from "@heroui/react";
import Icon from "../misc/icon";

export default function ModalWrapper({
  children,
  isOpen,
  setIsOpen,
  title,
  isShowGoBack,
  goBackCallback,
  placement = undefined,
}: {
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
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
      backdrop="opaque"
      isOpen={isOpen}
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
        setIsOpen(false);
      }}
      isDismissable={false}
      placement={placement}
    >
      <ModalContent>
        <div className="h-fit w-full grid grid-rows-[max-content_1fr]">
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
            <div className="max-h-[70vh] px-1 pb-4 grid grid-rows-[max-content_1fr] h-full">
              <p className="pb-4 text-center text-lg font-bold">{title}</p>
              <div className="overflow-y-auto w-full min-h-0 h-full max-h-full px-1">{children}</div>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
