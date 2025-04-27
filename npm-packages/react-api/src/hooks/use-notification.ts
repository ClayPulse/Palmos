import {
  NotificationTypeEnum,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";

import useIMC from "../lib/hooks/use-imc";

export default function useNotification(moduleName: string) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(moduleName, receiverHandlerMap);

  function openNotification(text: string, type: NotificationTypeEnum) {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }
    imc.sendMessage(IMCMessageTypeEnum.Notification, {
      text,
      type,
    });
  }

  return { openNotification };
}
