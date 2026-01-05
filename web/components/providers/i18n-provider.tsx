"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";

type Messages = Record<string, any>;

export default function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: Messages;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
