import { EditorContext } from "@/components/providers/editor-context-provider";
import { LocaleType, defaultLocale } from "@/i18n/config";
import { useContext, useEffect, useState } from "react";

const LOCALE_STORAGE_KEY = "pulse-editor-locale";

export function useLocale() {
  const editorContext = useContext(EditorContext);
  const [locale, setLocaleState] = useState<LocaleType>(defaultLocale);

  useEffect(() => {
    // Load locale from localStorage on mount
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored) {
      setLocaleState(stored as LocaleType);
    }
  }, []);

  const setLocale = (newLocale: LocaleType) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

    // Update editorContext persistSettings
    if (editorContext?.setPersistSettings) {
      editorContext.setPersistSettings((prev) => ({
        ...prev,
        locale: newLocale,
      }));
    }
  };

  return { locale, setLocale };
}
