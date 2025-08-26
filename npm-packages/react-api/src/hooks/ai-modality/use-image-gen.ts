import {
  ImageModelConfig,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";

export default function useImageGen() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  /**
   *
   * @param textPrompt The text prompt to generate the image.
   * @param imagePrompt A URL to an image or an image in an ArrayBuffer.
   * @param imageModelConfig (optional) The image model config to use.
   * @returns The generated image in an ArrayBuffer.
   */
  async function runImageGen(
    textPrompt?: string,
    imagePrompt?: string | ArrayBuffer,
    // LLM config is optional, if not provided, the default config will be used.
    imageModelConfig?: ImageModelConfig
  ): Promise<{
    arrayBuffer?: ArrayBuffer;
    url?: string;
  }> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    if (!textPrompt && !imagePrompt) {
      throw new Error("At least one of textPrompt or imagePrompt is required.");
    }

    const result = await imc
      .sendMessage(IMCMessageTypeEnum.ModalityImageGen, {
        textPrompt,
        imagePrompt,
        imageModelConfig,
      })
      .then((response) => {
        return response as {
          arrayBuffer?: ArrayBuffer;
          url?: string;
        };
      });

    return result;
  }

  return {
    runImageGen,
    isReady,
  };
}
