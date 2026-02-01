"use client";

import { EditorContext } from "@/components/providers/editor-context-provider";
import { useContext, useEffect, useState } from "react";
import ar from "../../messages/ar.json";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import hi from "../../messages/hi.json";
import ja from "../../messages/ja.json";
import pt from "../../messages/pt.json";
import ru from "../../messages/ru.json";
import zh from "../../messages/zh.json";

const messages: { [key: string]: any } = {
  en,
  es,
  fr,
  de,
  ja,
  zh,
  ru,
  ar,
  hi,
  pt,
};

export const locales = [
  "en",
  "zh",
  "es",
  "hi",
  "ar",
  "pt",
  "fr",
  "de",
  "ja",
  "ru",
] as const;
export type LocaleType = (typeof locales)[number];

export const languageNames: Record<LocaleType, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  hi: "हिन्दी",
  ar: "العربية",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ru: "Русский",
};

export function useTranslations() {
  const editorContext = useContext(EditorContext);

  const [locale, setLocaleState] = useState("en" as LocaleType);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const savedLocale =
      editorContext?.persistSettings?.locale ??
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("locale="))
        ?.split("=")[1];
    const finalLocale = (savedLocale as LocaleType) || "en";
    setLocaleState(finalLocale);
  }, [editorContext?.persistSettings?.locale, isLoaded]);

  function getTranslations(key: string, variables?: { [key: string]: any }) {
    const localeMessages = messages[locale] ?? messages["en"];

    // Localize nested keys using dot notation
    const keys = key.split(".");
    let translation = localeMessages;
    for (const k of keys) {
      translation = translation[k];
    }
    if (typeof translation !== "string") {
      translation = key;
    }

    if (variables) {
      Object.keys(variables).forEach((varKey) => {
        const varValue = variables[varKey];
        const regex = new RegExp(`{${varKey}}`, "g");
        translation = translation.replace(regex, varValue);
      });
    }
    return translation;
  }

  function setLocale(newLocale: LocaleType) {
    // Save the locale to persist settings
    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      locale: newLocale,
    }));

    // Also save a copy in cookies as a fallback
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`; // 1 year
  }

  return { getTranslations, setLocale, locale };
}
