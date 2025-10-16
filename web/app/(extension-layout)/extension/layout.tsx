import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { ReactNode, Suspense } from "react";

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full w-full">
      <body className="h-full w-full overflow-hidden">
        <Analytics />
        <ThemeProvider attribute={["class", "data-theme"]}>
          <RemoteModuleProvider isPreventingCSS={false}>
            <Suspense>{children}</Suspense>
          </RemoteModuleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
