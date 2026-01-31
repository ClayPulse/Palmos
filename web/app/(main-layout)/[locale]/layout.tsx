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
import { routing } from "@/i18n/routing";
import { Analytics } from "@vercel/analytics/next";
import "material-icons/iconfont/material-icons.css";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  title: "Pulse Editor Web",
  description: "Web-based Vibe Coding Editor",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html suppressHydrationWarning>
      <body
        className={`bg-default h-[100dvh] w-[100dvw] pt-[env(safe-area-inset-top)] antialiased`}
      >
        <Analytics />
        <Suspense>
          <I18nProvider>
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
