import type { Metadata } from "next";
import "./globals.css";
import WrappedHeroUIProvider from "@/components/providers/wrapped-hero-ui-provider";
import EditorContextProvider from "@/components/providers/editor-context-provider";
import { Toaster } from "react-hot-toast";
import "material-icons/iconfont/material-icons.css";
import CapacitorProvider from "@/components/providers/capacitor-provider";
import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import InterModuleCommunicationProvider from "@/components/providers/imc-provider";
import Nav from "@/components/interface/nav";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";

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
          <CapacitorProvider>
            <WrappedHeroUIProvider>
              <EditorContextProvider>
                <InterModuleCommunicationProvider>
                  <RemoteModuleProvider isPreventingCSS={true}>
                    <Toaster />
                    <Nav>{children}</Nav>
                  </RemoteModuleProvider>
                </InterModuleCommunicationProvider>
              </EditorContextProvider>
            </WrappedHeroUIProvider>
          </CapacitorProvider>
        </Suspense>
      </body>
    </html>
  );
}
