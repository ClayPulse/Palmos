import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "de", "es", "fr", "zh", "ja", "ru", "ar", "pt", "hi"],

  // Used when no locale matches
  defaultLocale: "en",
  localePrefix: "always"
});
