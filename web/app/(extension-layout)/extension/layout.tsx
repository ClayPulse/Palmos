import RemoteExtensionProvider from "@/components/providers/remote-extension-provider";
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
        <RemoteExtensionProvider isPreventingCSS={false}>
          <Suspense>{children}</Suspense>
        </RemoteExtensionProvider>
      </body>
    </html>
  );
}
