import Nav from "@/components/interface/navigation/nav";
import CapacitorProvider from "@/components/providers/capacitor-provider";
import DndProvider from "@/components/providers/dnd-provider";
import EditorContextProvider from "@/components/providers/editor-context-provider";
import InterModuleCommunicationProvider from "@/components/providers/imc-provider";
import InputDeviceProvider from "@/components/providers/input-device-provider";
import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import WrappedHeroUIProvider from "@/components/providers/wrapped-hero-ui-provider";
import { Analytics } from "@vercel/analytics/next";
import "material-icons/iconfont/material-icons.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse Editor",
  description: "AI powered editor to boost your creativity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`h-[100dvh] w-[100dvw] antialiased`}>
        <Analytics />
        <Suspense>
          <WrappedHeroUIProvider>
            <EditorContextProvider>
              <CapacitorProvider>
                <InterModuleCommunicationProvider>
                  <DndProvider>
                    <RemoteModuleProvider isPreventingCSS={true}>
                      <InputDeviceProvider>
                        <Toaster />
                        <Nav>{children}</Nav>
                      </InputDeviceProvider>
                    </RemoteModuleProvider>
                  </DndProvider>
                </InterModuleCommunicationProvider>
              </CapacitorProvider>
            </EditorContextProvider>
          </WrappedHeroUIProvider>
        </Suspense>
      </body>
    </html>
  );
}
