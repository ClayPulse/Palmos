import {
  IMCMessage,
  IMCMessageTypeEnum,
  LLMConfig,
} from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

export default function useLLM() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "llm");

  async function runLLM(
    prompt: string,
    // LLM config is optional, if not provided, the default config will be used.
    llmConfig?: LLMConfig
  ): Promise<string> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    const result = await imc
      .sendMessage(IMCMessageTypeEnum.ModalityLLM, {
        prompt,
        llmConfig,
      })
      .then((response) => {
        return response as string;
      });

    return result;
  }

  return {
    runLLM,
    isReady,
  };
}
