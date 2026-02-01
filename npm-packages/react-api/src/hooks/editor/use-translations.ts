import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

/**
 * Use internationalization for app. The locale is synced with Editor.
 *
 * @param messages The messages object containing translations for different locales,
 * where each key is a locale code (e.g., 'en', 'es') and the value is an ICU message object.
 *
 * @return An object containing:
 * - locale: The current locale string.
 * - getTranslations: A function that takes an ICU message key and optional variables to return the translated string
 * for the current locale provided in the messages parameter.
 */
export function useTranslations(messages: { [key: string]: any }) {
  const [locale, setLocale] = useState("en");

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  receiverHandlerMap.set(
    IMCMessageTypeEnum.EditorLocaleUpdate,
    async (senderWindow: Window, message: IMCMessage) => {
      const locale = message.payload;
      setLocale((prev) => locale);
    },
  );

  const { imc, isReady } = useIMC(receiverHandlerMap, "locale");

  // Upon initial load, request locale from main app
  useEffect(() => {
    if (isReady) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.EditorAppRequestLocale)
        .then((result) => {
          setLocale((prev) => result);
        });
    }
  }, [isReady]);

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

  return { locale, getTranslations };
}
