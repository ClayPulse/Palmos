import {
  IMCMessage,
  IMCMessageTypeEnum,
  NotificationTypeEnum,
} from "@pulse-editor/shared-utils";

import useIMC from "../imc/use-imc";

export default function useNotification() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "notification");

  function openNotification(text: string, type: NotificationTypeEnum) {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.EditorShowNotification, {
        text,
        type,
      });
    }
  }

  return { isReady, openNotification };
}
