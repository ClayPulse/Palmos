"use client";

import AppModeToggle from "@/components/interface/app-mode-toggle";
import VoiceIndicator from "@/components/interface/voice-indicator";
import type { CSSProperties, ReactNode } from "react";

export default function AppNavBar({
  left,
  right,
  style,
}: {
  left?: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <nav className="absolute z-40 w-full px-2 py-2" style={style}>
      <div className="text-default-foreground bg-content1 grid h-14 w-full grid-cols-3 items-center rounded-xl px-3 shadow-md">
        <div className="flex items-center">{left}</div>
        <div className="relative flex flex-col items-center justify-center">
          <AppModeToggle />
          <VoiceIndicator />
        </div>
        <div className="flex items-center justify-end">{right}</div>
      </div>
    </nav>
  );
}
