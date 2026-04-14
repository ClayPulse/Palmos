import Nav from "@/components/interface/navigation/nav";
import CapacitorProvider from "@/components/providers/capacitor-provider";
import DndProvider from "@/components/providers/dnd-provider";
import EditorContextProvider from "@/components/providers/editor-context-provider";
import InterModuleCommunicationProvider from "@/components/providers/imc-provider";
import InputDeviceProvider from "@/components/providers/input-device-provider";
import ChatProvider from "@/components/providers/chat-provider";
import ModalProvider from "@/components/providers/modal-provider";
import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import WrappedHeroUIProvider from "@/components/providers/wrapped-hero-ui-provider";
import { Analytics } from "@vercel/analytics/next";
import "material-icons/iconfont/material-icons.css";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palmos: The Runtime Where AI Agents Build, Ship, and Evolve",
  description: "Web-based Vibe Coding Editor",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`bg-default h-[100dvh] w-full overflow-hidden pt-[env(safe-area-inset-top)] antialiased`}
      >
        <Analytics />
        <Suspense>
          <WrappedHeroUIProvider>
            <EditorContextProvider>
              <CapacitorProvider>
                <InterModuleCommunicationProvider>
                  <ChatProvider>
                  <ModalProvider>
                    <DndProvider>
                      <RemoteModuleProvider isPreventingCSS={true}>
                        <InputDeviceProvider>
                          <Toaster />
                          <Nav>{children}</Nav>
                        </InputDeviceProvider>
                      </RemoteModuleProvider>
                    </DndProvider>
                  </ModalProvider>
                  </ChatProvider>
                </InterModuleCommunicationProvider>
              </CapacitorProvider>
            </EditorContextProvider>
          </WrappedHeroUIProvider>
        </Suspense>
      </body>
    </html>
  );
}
