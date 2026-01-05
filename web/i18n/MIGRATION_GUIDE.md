# Migration Guide: Converting Hardcoded Strings to i18n

This guide will help you convert existing hardcoded strings in the codebase to use next-intl translations.

## Step-by-Step Process

### 1. Identify Hardcoded Strings

Look for text that should be translatable, such as:
- UI labels and buttons
- Error messages
- Form field labels
- Modal titles
- Menu items
- Tooltips
- Status messages

**Do NOT translate:**
- API endpoints
- Configuration keys
- CSS classes
- Variable names
- Code comments

### 2. Add Translation Keys

Add the appropriate keys to `/web/messages/en.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a description",
    "button": {
      "save": "Save",
      "cancel": "Cancel"
    }
  }
}
```

### 3. Update the Component

#### For Client Components

Add the `"use client"` directive if not already present, then use `useTranslations`:

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t("myFeature.title")}</h1>
      <p>{t("myFeature.description")}</p>
      <button>{t("myFeature.button.save")}</button>
    </div>
  );
}
```

#### For Server Components (Future Support)

For server components, you would use `getTranslations` from `next-intl/server`:

```tsx
import { getTranslations } from "next-intl/server";

export default async function MyServerComponent() {
  const t = await getTranslations();
  
  return <h1>{t("myFeature.title")}</h1>;
}
```

### 4. Handle Dynamic Content

For strings with variables, use template strings:

**messages/en.json:**
```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "You have {count} items"
}
```

**Component:**
```tsx
const t = useTranslations();
return (
  <>
    <p>{t("greeting", { name: userName })}</p>
    <p>{t("itemCount", { count: items.length })}</p>
  </>
);
```

### 5. Pluralization

For text that needs to handle singular/plural forms:

**messages/en.json:**
```json
{
  "items": {
    "count": "{count, plural, =0 {No items} =1 {One item} other {# items}}"
  }
}
```

**Component:**
```tsx
const t = useTranslations();
return <p>{t("items.count", { count: itemCount })}</p>;
```

## Common Patterns

### Before (Hardcoded):
```tsx
<Button>Sign In</Button>
```

### After (i18n):
```tsx
const t = useTranslations();
return <Button>{t("common.signIn")}</Button>;
```

### Before (Hardcoded with condition):
```tsx
{isConnected ? <span>Connected</span> : <span>Offline</span>}
```

### After (i18n):
```tsx
const t = useTranslations();
return isConnected 
  ? <span>{t("navigation.connected")}</span>
  : <span>{t("navigation.offline")}</span>;
```

## Best Practices

1. **Key Naming**: Use descriptive, hierarchical keys
   - Good: `settings.editorSettings`
   - Bad: `editorSettings` or `ed_set`

2. **Grouping**: Group related translations together
   ```json
   {
     "auth": {
       "signIn": "...",
       "signOut": "...",
       "register": "..."
     }
   }
   ```

3. **Avoid Duplication**: Reuse common strings
   ```tsx
   t("common.save")  // Instead of creating multiple "save" keys
   ```

4. **Context**: Add context to ambiguous words
   ```json
   {
     "menu.file.open": "Open",  // Open a file
     "shop.status.open": "Open"  // Shop is open
   }
   ```

5. **Keep Keys in English**: Use English for keys even if the default language changes

## Priority Components to Migrate

Start with user-facing components:
1. Navigation components
2. Modal dialogs
3. Settings pages
4. Error messages
5. Form labels
6. Tooltips and help text

## Testing

After migration, test that:
1. All strings display correctly
2. No missing translation keys (check console for warnings)
3. Dynamic content renders properly
4. Build completes successfully: `npm run build`

## Tools

You can use these commands to find hardcoded strings:

```bash
# Find JSX strings in components
grep -r ">\s*[A-Z][a-z]" components/ --include="*.tsx"

# Find string literals in attributes
grep -r 'label="[^{]' components/ --include="*.tsx"
```

## Need Help?

Refer to:
- [next-intl documentation](https://next-intl-docs.vercel.app/)
- Existing examples in the codebase
- The main i18n README at `/web/i18n/README.md`
