import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";

import useIMC from "../lib/use-imc";

export default function useOCR() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(receiverHandlerMap);

  async function recognizeText(uri: string): Promise<string> {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }

    // Send the message to the extension
    const result = await imc.sendMessage(IMCMessageTypeEnum.OCR, { uri });

    return result.payload.text;
  }

  return {
    recognizeText,
  };
}
