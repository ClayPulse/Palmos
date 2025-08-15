import {
  NotificationTypeEnum,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";

import useIMC from "../../lib/use-imc";

export default function useNotification() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(receiverHandlerMap);

  function openNotification(text: string, type: NotificationTypeEnum) {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }
    imc.sendMessage(IMCMessageTypeEnum.EditorShowNotification, {
      text,
      type,
    });
  }

  return { openNotification };
}
