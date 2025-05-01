import { Agent, IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../lib/hooks/use-imc";

export default function useAgents() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  async function installAgent(config: Agent) {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    await imc
      .sendMessage(IMCMessageTypeEnum.InstallAgent, config)
      .catch((error) => {
        throw new Error(error);
      });
  }

  async function runAgentMethod(
    agentName: string,
    methodName: string,
    parameters: Record<string, any>,
    abortSignal?: AbortSignal
  ): Promise<Record<string, any>> {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    const result = await imc
      .sendMessage(
        IMCMessageTypeEnum.RunAgentMethod,
        {
          agentName,
          methodName,
          parameters,
        },
        abortSignal
      )
      .then((response) => {
        return response as Record<string, any>;
      });

    return result;
  }

  return {
    installAgent,
    runAgentMethod,
    isReady,
  };
}
