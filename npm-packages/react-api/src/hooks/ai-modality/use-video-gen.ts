import {
  IMCMessage,
  IMCMessageTypeEnum,
  VideoModelConfig,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";

export default function useVideoGen() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  /**
   *
   * @param textPrompt The text prompt to generate the video.
   * @param imagePrompt A URL to an image or an image in an ArrayBuffer.
   * @param videoModelConfig (optional) The video model config to use.
   * @returns The generated video in an ArrayBuffer.
   */
  async function runVideoGen(
    duration: number,
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
    // LLM config is optional, if not provided, the default config will be used.
    videoModelConfig?: VideoModelConfig
  ): Promise<{
    url?: string;
    arrayBuffer?: ArrayBuffer;
  }> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    if (!textPrompt && !imagePrompt) {
      throw new Error("At least one of textPrompt or imagePrompt is required.");
    }

    const result = await imc
      .sendMessage(IMCMessageTypeEnum.ModalityVideoGen, {
        duration,
        textPrompt,
        imagePrompt,
        videoModelConfig,
      })
      .then((response) => {
        return response as {
          url?: string;
          arrayBuffer?: ArrayBuffer;
        };
      });

    return result;
  }

  return {
    runVideoGen,
    isReady,
  };
}
