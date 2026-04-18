"use client";

import Icon from "@/components/misc/icon";
import ModalWrapper from "@/components/modals/wrapper";
import { Button } from "@heroui/react";

export default function VoiceCallModal({
  isOpen,
  onClose,
  status,
  isSpeaking,
}: {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  isSpeaking: boolean;
}) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="AI Manager">
      <div className="flex flex-col items-center gap-5 px-4 pb-6 text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${isSpeaking ? "animate-pulse bg-amber-100 dark:bg-amber-500/15" : "bg-green-100 dark:bg-green-500/15"} transition-colors`}
        >
          <Icon
            name={isSpeaking ? "graphic_eq" : "mic"}
            variant="round"
            className={`text-4xl ${isSpeaking ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
          />
        </div>
        <div>
          <p className="text-default-800 text-sm font-semibold dark:text-white/90">
            {status === "connected"
              ? isSpeaking
                ? "AI Manager is speaking..."
                : "Listening..."
              : "Connecting..."}
          </p>
          <p className="text-default-400 mt-1 text-xs dark:text-white/40">
            Speak naturally — your AI manager is here to help
          </p>
        </div>
        <Button
          className="bg-red-500 font-semibold text-white"
          onPress={onClose}
          startContent={
            <Icon name="call_end" variant="round" className="text-sm" />
          }
        >
          End Call
        </Button>
      </div>
    </ModalWrapper>
  );
}
