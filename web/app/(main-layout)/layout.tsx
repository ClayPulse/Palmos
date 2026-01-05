import Nav from "@/components/interface/navigation/nav";
import CapacitorProvider from "@/components/providers/capacitor-provider";
import DndProvider from "@/components/providers/dnd-provider";
import EditorContextProvider from "@/components/providers/editor-context-provider";
import I18nProvider from "@/components/providers/i18n-provider";
import InterModuleCommunicationProvider from "@/components/providers/imc-provider";
import InputDeviceProvider from "@/components/providers/input-device-provider";
import ModalProvider from "@/components/providers/modal-provider";
import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import WrappedHeroUIProvider from "@/components/providers/wrapped-hero-ui-provider";
import { Analytics } from "@vercel/analytics/next";
import "material-icons/iconfont/material-icons.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import messages from "../../messages/en.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse Editor",
  description: "AI powered editor to boost your creativity",
};

const locale = "en";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`bg-default h-[100dvh] w-[100dvw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] antialiased`}
      >
        <Analytics />
        <Suspense>
          <I18nProvider locale={locale} messages={messages}>
            <WrappedHeroUIProvider>
              <EditorContextProvider>
                <CapacitorProvider>
                  <InterModuleCommunicationProvider>
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
                  </InterModuleCommunicationProvider>
                </CapacitorProvider>
              </EditorContextProvider>
            </WrappedHeroUIProvider>
          </I18nProvider>
        </Suspense>
      </body>
    </html>
  );
}
