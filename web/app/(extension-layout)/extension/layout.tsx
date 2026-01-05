import I18nProvider from "@/components/providers/i18n-provider";
import RemoteModuleProvider from "@/components/providers/remote-module-provider";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { ReactNode, Suspense } from "react";
import messages from "../../../messages/en.json";

const locale = "en";

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={locale} suppressHydrationWarning className="h-full w-full">
      <body className="h-full w-full overflow-hidden">
        <Analytics />
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider attribute={["class", "data-theme"]}>
            <RemoteModuleProvider isPreventingCSS={false}>
              <Suspense>{children}</Suspense>
            </RemoteModuleProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
