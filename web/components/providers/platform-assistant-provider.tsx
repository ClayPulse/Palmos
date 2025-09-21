"use client";

import { ReactNode } from "react";
import Voice from "../tools/voice";
import usePlatformAIAssistant from "@/lib/hooks/use-platform-ai-assistant";
import useRecorder from "@/lib/hooks/use-recorder";

export default function PlatformAssistantProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isUseManagedCloud } = usePlatformAIAssistant();
  const { isRecording } = useRecorder();

  return (
    <div className="relative h-full w-full">
      {isRecording && <Voice isUseManagedCloud={isUseManagedCloud} />}

      {children}
    </div>
  );
}
