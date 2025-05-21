import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import { ReactNode, Suspense } from "react";

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          height: "100vh",
          width: "100vw",
        }}
      >
        <RemoteModuleProvider isPreventingCSS={false}>
          <Suspense>{children}</Suspense>
        </RemoteModuleProvider>
      </body>
    </html>
  );
}
