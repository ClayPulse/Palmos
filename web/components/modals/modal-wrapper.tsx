import { Button, Modal, ModalContent } from "@heroui/react";
import Icon from "../misc/icon";

export default function ModalWrapper({
  children,
  isOpen,
  setIsOpen,
  title,
  isShowGoBack,
  goBackCallback,
}: {
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  isShowGoBack?: boolean;
  goBackCallback?: () => void;
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
    >
      <ModalContent>
        <div className="h-fit w-full">
          {isShowGoBack && (
            <Button
              className="absolute left-1 top-1 rounded-full text-foreground-500"
              isIconOnly
              onPress={goBackCallback}
              size="sm"
              variant="light"
            >
              <Icon name="arrow_back" className="text-[18px]!" />
            </Button>
          )}

          <div className="h-fit w-full pt-8">
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
              <p className="pb-4 text-center text-lg font-bold">{title}</p>
              {children}
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
