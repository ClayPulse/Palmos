import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";

import useIMC from "../lib/hooks/use-imc";

export default function useOCR(moduleName: string) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(moduleName, receiverHandlerMap);

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
