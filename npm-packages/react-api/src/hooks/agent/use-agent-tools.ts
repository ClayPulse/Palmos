import { AgentTool, IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

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

  const { imc } = useIMC(receiverHandlerMap, "agent-tools");

  return {  };
}
