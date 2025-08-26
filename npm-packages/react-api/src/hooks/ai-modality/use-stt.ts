import {
  IMCMessage,
  IMCMessageTypeEnum,
  STTConfig,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";

export default function useSTT() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  async function runSTT(
    audio: Uint8Array,
    // Config is optional, if not provided, the default config will be used.
    sttConfig?: STTConfig
  ): Promise<string> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    const result = await imc
      .sendMessage(IMCMessageTypeEnum.ModalitySTT, {
        audio,
        sttConfig,
      })
      .then((response) => {
        return response as string;
      });

    return result;
  }

  return {
    runSTT,
    isReady,
  };
}
