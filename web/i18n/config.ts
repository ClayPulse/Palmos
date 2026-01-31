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
export const defaultLocale = "en" as const;

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
