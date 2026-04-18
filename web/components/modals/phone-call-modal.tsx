"use client";

import Icon from "@/components/misc/icon";
import ModalWrapper from "@/components/modals/wrapper";
import { Button, Spinner } from "@heroui/react";

export default function PhoneCallModal({
  isOpen,
  onClose,
  phone,
  callStatus,
  callError,
  callbackNumber,
  onRetry,
}: {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  callStatus: "calling" | "success" | "failed";
  callError: string;
  callbackNumber: string;
  onRetry: () => void;
}) {
  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={
        callStatus === "failed"
          ? "Call failed"
          : callStatus === "calling"
            ? "Initiating call..."
            : "Call is on the way"
      }
    >
      <div className="flex flex-col items-center gap-4 px-4 pb-4 text-center">
        {callStatus === "calling" ? (
          <>
            <Spinner size="lg" />
            <p className="text-default-700 text-sm dark:text-white/80">
              Calling <span className="font-semibold">{phone}</span>...
            </p>
          </>
        ) : callStatus === "failed" ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <Icon
                name="call_end"
                variant="round"
                className="text-3xl text-red-600 dark:text-red-400"
              />
            </div>
            <p className="text-default-700 text-sm dark:text-white/80">
              {callError}
            </p>
            <Button className="mt-2" variant="flat" onPress={onRetry}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <Icon
                name="call"
                variant="round"
                className="text-3xl text-green-600 dark:text-green-400"
              />
            </div>
            <p className="text-default-700 text-sm dark:text-white/80">
              We&apos;re calling <span className="font-semibold">{phone}</span>{" "}
              now. Your AI manager will be with you shortly.
            </p>
          </>
        )}
        {callbackNumber && (
          <>
            <p className="text-default-400 text-xs dark:text-white/40">
              If you don't receive a call, you can also call us at:
            </p>
            <a
              href={`tel:${callbackNumber}`}
              className="text-lg font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              {callbackNumber}
            </a>
          </>
        )}
        <Button className="mt-2" variant="flat" onPress={onClose}>
          Close
        </Button>
      </div>
    </ModalWrapper>
  );
}
