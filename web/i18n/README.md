# Internationalization (i18n) with next-intl

This project uses [next-intl](https://next-intl-docs.vercel.app/) for internationalization support.

## Structure

- `/web/i18n/` - i18n configuration files
  - `config.ts` - Locale configuration (available locales, default locale)
  - `request.ts` - Request configuration for next-intl server
- `/web/messages/` - Translation files
  - `en.json` - English translations (default)
  - Add more locale files as needed (e.g., `es.json`, `fr.json`, etc.)
- `/web/components/providers/i18n-provider.tsx` - Client-side i18n provider wrapper

## How to Add a New Language

### 1. Create a new translation file

Create a new JSON file in `/web/messages/` named after the locale code (e.g., `es.json` for Spanish):

```bash
cp web/messages/en.json web/messages/es.json
```

Then translate the strings in the new file.

### 2. Update the locale configuration

Edit `/web/i18n/config.ts` to add the new locale:

```typescript
export const locales = ["en", "es"] as const;
export const defaultLocale = "en" as const;
```

### 3. Update the request configuration (if needed)

For static export mode (current setup), the locale is hardcoded. To support multiple locales, you would need to implement locale switching logic or generate separate builds for each locale.

## Using Translations in Components

### In Client Components

Import and use the `useTranslations` hook from `next-intl`:

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t("common.signIn")}</h1>
      <p>{t("navigation.connectedToCloudAI")}</p>
    </div>
  );
}
```

### Adding New Translation Keys

Edit `/web/messages/en.json` (and other locale files) to add new keys:

```json
{
  "common": {
    "signIn": "Sign In",
    "signOut": "Sign out",
    "newKey": "New Translation"
  },
  "settings": {
    "editorSettings": "Editor Settings"
  }
}
```

Then use them in your components:

```tsx
const t = useTranslations();
return <button>{t("common.newKey")}</button>;
```

## Translation Key Organization

The translation keys are organized by feature/section:

- `common` - Common UI elements (buttons, actions, etc.)
- `navigation` - Navigation-related text
- `settings` - Settings page text
- `subscription` - Subscription-related text
- `account` - Account-related text
- `metadata` - Page metadata (title, description)

## Current Implementation Notes

- The current implementation uses **static export mode** which means the locale is fixed at build time
- The default locale is set to `"en"` (English)
- To support runtime locale switching, you would need to:
  1. Remove the `output: "export"` from `next.config.ts`
  2. Implement locale detection and switching logic
  3. Update the routing to support locale prefixes (e.g., `/en/page`, `/es/page`)

## Examples in the Codebase

See these files for implementation examples:
- `/web/components/interface/navigation/nav-top-bar.tsx`
- `/web/components/modals/editor-settings-modal.tsx`
- `/web/app/(main-layout)/layout.tsx`
