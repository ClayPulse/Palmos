import { AgentTool, IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../lib/hooks/use-imc";

/**
 * Add or use agent tools in the editor.
 * @param moduleName 
 * @returns 
 */
export default function useAgentTools() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(receiverHandlerMap);

  async function installAgentTool(tool: AgentTool) {
    if (!imc) {
      throw new Error("IMC not initialized.");
    }

    await imc
      .sendMessage(IMCMessageTypeEnum.InstallAgentTool, tool)
      .then((response) => {
        if (response.type === IMCMessageTypeEnum.Error) {
          throw new Error(response.payload);
        }
      });
  }

  return { installAgentTool };
}
