import {
  IMCMessage,
  IMCMessageTypeEnum,
  TTSConfig,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";

export default function useTTS() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  async function runTTS(
    text: string,
    // Config is optional, if not provided, the default config will be used.
    ttsConfig?: TTSConfig
  ): Promise<Uint8Array> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    const result = await imc
      .sendMessage(IMCMessageTypeEnum.ModalityTTS, {
        text,
        ttsConfig,
      })
      .then((response) => {
        return response as Uint8Array;
      });

    return result;
  }

  return {
    runTTS,
    isReady,
  };
}
