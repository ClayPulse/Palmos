import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

/**
 * Hook to access and update persisted settings for a specific app in the editor.
 * @param appId The ID of the app whose settings should be retrieved and updated.
 * @returns `isReady`, the current `settings` object, and an `updateSettings` function.
 */
export default function useAppSettings(appId: string) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "app-settings");
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady]);

  async function refetch() {
    const result = await imc?.sendMessage(
      IMCMessageTypeEnum.EditorGetAppSettings,
      { appId },
    );
    setSettings(result ?? {});
    setIsLoaded(true);
  }

  async function updateSettings(newSettings: Record<string, any>) {
    await imc?.sendMessage(IMCMessageTypeEnum.EditorSetAppSettings, {
      appId,
      settings: newSettings,
    });
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }

  async function deleteSetting(key: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.EditorDeleteAppSetting, {
      appId,
      key,
    });
    setSettings((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  return {
    isReady,
    isLoaded,
    settings,
    refetch,
    updateSettings,
    deleteSetting,
  };
}
