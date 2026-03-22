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

  useEffect(() => {
    if (isReady) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.EditorGetAppSettings, { appId })
        .then((result) => {
          setSettings(result ?? {});
        });
    }
  }, [isReady]);

  async function updateSettings(newSettings: Record<string, any>) {
    await imc?.sendMessage(IMCMessageTypeEnum.EditorSetAppSettings, {
      appId,
      settings: newSettings,
    });
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }

  return {
    isReady,
    settings,
    updateSettings,
  };
}
