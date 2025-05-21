// app/providers.tsx
"use client";

import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";

export function WrappedHeroUIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute={["class", "data-theme"]}>
      <HeroUIProvider className="h-full w-full">
        <div className="h-full w-full bg-white dark:bg-black">{children}</div>
        <ToastProvider />
      </HeroUIProvider>
    </ThemeProvider>
  );
}
