import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";

import useIMC from "../imc/use-imc";

export default function useOCR() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(receiverHandlerMap, "ocr");

  /**
   * 
   * @param image The image to be recognized. This is a base64 encoded string.
   * @returns 
   */
  async function recognizeText(image: string): Promise<string> {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }

    // Send the message to the extension
    const result = await imc.sendMessage(IMCMessageTypeEnum.ModalityOCR, { image });

    return result.payload.text;
  }

  return {
    recognizeText,
  };
}
