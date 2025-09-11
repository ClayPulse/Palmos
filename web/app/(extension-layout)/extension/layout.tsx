import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import { ReactNode, Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full w-full overflow-hidden">
        <Analytics />
        <RemoteModuleProvider isPreventingCSS={false}>
          <Suspense>{children}</Suspense>
        </RemoteModuleProvider>
      </body>
    </html>
  );
}
