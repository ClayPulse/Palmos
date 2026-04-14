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
    <nav className="absolute z-40 w-full px-1.5 py-1.5 md:px-2 md:py-2" style={style}>
      <div className="text-default-foreground bg-content1 grid h-12 w-full grid-cols-[1fr_auto_1fr] items-center rounded-xl px-2 shadow-md md:h-14 md:px-3">
        <div className="flex min-w-0 items-center">{left}</div>
        <div className="relative flex shrink-0 flex-col items-center justify-center">
          <AppModeToggle />
          <VoiceIndicator />
        </div>
        <div className="flex min-w-0 items-center justify-end">{right}</div>
      </div>
    </nav>
  );
}
