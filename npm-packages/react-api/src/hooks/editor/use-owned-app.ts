import {
  AppConfig,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import { useCallback } from "react";
import useIMC from "../imc/use-imc";

export default function useOwnedApp() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >([]);

  const { imc, isReady } = useIMC(receiverHandlerMap, "owned-app");

  const runOwnedAppAction = useCallback(
    async (
      ownedApp: {
        viewId: string;
        config: AppConfig;
      },
      actionName: string,
      args: any
    ) => {
      if (isReady) {
        const appViewId = ownedApp.viewId;
        const preRegisteredActions = ownedApp.config.preRegisteredActions || [];

        const action = preRegisteredActions.find((a) => a.name === actionName);
        if (!action) {
          throw new Error(
            `Action ${actionName} not found in owned app ${ownedApp.config.id}`
          );
        }

        const result = await imc?.sendMessage(
          IMCMessageTypeEnum.EditorAppUseOwnedApp,
          {
            viewId: appViewId,
            actionName,
            args,
          }
        );
        return result;
      }
      return undefined;
    },
    [imc, isReady]
  );

  return {
    runOwnedAppAction,
  };
}
