import { EditorContextType } from "../types";

export function getAPIKey(
  editorContext: EditorContextType | undefined,
  provider: string | undefined,
) {
  if (!provider) {
    return undefined;
  } else if (!editorContext?.persistSettings?.apiKeys) {
    return undefined;
  }

  const apiKey = editorContext?.persistSettings?.apiKeys[provider];

  if (!apiKey) {
    return undefined;
  }

  return apiKey;
}

export function setAPIKey(
  editorContext: EditorContextType | undefined,
  provider: string | undefined,
  apiKey: string,
) {
  if (!provider) {
    return;
  } else if (!editorContext) {
    console.error("Editor context is undefined. Cannot set API key.");
    return;
  }

  editorContext?.setPersistSettings((prev) => {
    return {
      ...prev,
      apiKeys: {
        ...prev?.apiKeys,
        [provider]: apiKey,
      },
    };
  });
}
