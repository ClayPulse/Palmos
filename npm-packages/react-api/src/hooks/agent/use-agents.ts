import {
  Agent,
  IMCMessage,
  IMCMessageTypeEnum,
  LLMConfig,
} from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

export default function useAgents() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  async function runAgentMethod(
    agentName: string,
    methodName: string,
    args: Record<string, any>,
    abortSignal?: AbortSignal,
    llmConfig?: LLMConfig
  ): Promise<any> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    const result = await imc
      .sendMessage(
        IMCMessageTypeEnum.EditorRunAgentMethod,
        {
          agentName,
          methodName,
          args,
          llmConfig,
        },
        abortSignal
      )
      .then((response) => {
        return response as any;
      });

    return result;
  }

  return {
    runAgentMethod,
    isReady,
  };
}
