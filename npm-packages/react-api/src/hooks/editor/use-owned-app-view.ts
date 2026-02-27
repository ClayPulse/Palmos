import {
  IMCMessage,
  IMCMessageTypeEnum,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { useCallback } from "react";
import useIMC from "../imc/use-imc";

export default function useOwnedAppView() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >([]);

  const { imc, isReady } = useIMC(receiverHandlerMap, "owned-app");

  const runAppAction = useCallback(
    async (ownedAppViewModel: ViewModel, actionName: string, args: any) => {
      if (isReady) {
        const appViewId = ownedAppViewModel.viewId;
        const skillActions =
          ownedAppViewModel.appConfig.actions || [];

        const action = skillActions.find((a) => a.name === actionName);
        if (!action) {
          throw new Error(
            `Action ${actionName} not found in owned app ${ownedAppViewModel.appConfig.id}`,
          );
        }

        const result = await imc?.sendMessage(
          IMCMessageTypeEnum.EditorAppUseOwnedApp,
          {
            viewId: appViewId,
            actionName,
            args,
          },
        );
        return result;
      }
      return undefined;
    },
    [imc, isReady],
  );

  return {
    isReady,
    runAppAction,
  };
}
