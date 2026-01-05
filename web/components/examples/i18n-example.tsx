/**
 * Example Component demonstrating next-intl usage
 * 
 * This is a reference example showing how to use i18n translations
 * in components. You can refer to this when implementing translations
 * in other parts of the application.
 */

"use client";

import { useTranslations } from "next-intl";

export default function I18nExample() {
  const t = useTranslations();

  // Example 1: Simple translation
  const simpleText = t("common.signIn");

  // Example 2: Nested translation keys
  const nestedText = t("settings.editorSettings");

  // Example 3: Translation with variables
  // First, add to messages/en.json:
  // "example": {
  //   "greeting": "Hello, {name}!"
  // }
  // Then use it:
  // const greeting = t("example.greeting", { name: "User" });

  // Example 4: Conditional translations
  const isConnected = true;
  const statusText = isConnected
    ? t("navigation.connectedToCloudAI")
    : t("navigation.offline");

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">i18n Examples</h1>
      
      {/* Example 1: Simple usage */}
      <div>
        <h2 className="font-semibold">Simple Translation:</h2>
        <p>{simpleText}</p>
      </div>

      {/* Example 2: Nested keys */}
      <div>
        <h2 className="font-semibold">Nested Keys:</h2>
        <p>{nestedText}</p>
      </div>

      {/* Example 3: Direct inline usage */}
      <div>
        <h2 className="font-semibold">Inline Usage:</h2>
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          {t("common.save")}
        </button>
      </div>

      {/* Example 4: Conditional text */}
      <div>
        <h2 className="font-semibold">Conditional Text:</h2>
        <p className={isConnected ? "text-green-600" : "text-yellow-600"}>
          {statusText}
        </p>
      </div>

      {/* Example 5: Multiple translations in a component */}
      <div>
        <h2 className="font-semibold">Form Example:</h2>
        <form className="space-y-2">
          <input 
            type="text" 
            placeholder={t("settings.projectHomePath")}
            className="border p-2 rounded"
          />
          <div className="space-x-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
              {t("common.save")}
            </button>
            <button type="button" className="px-4 py-2 bg-gray-300 rounded">
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
