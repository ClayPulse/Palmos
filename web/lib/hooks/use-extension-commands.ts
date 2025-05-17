import { IMCContext } from "@/components/providers/imc-provider";
import { IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useContext } from "react";

export default function useExtensionCommands() {
  const imcContext = useContext(IMCContext);

  async function runCommand(windowId: string, commandName: string, args: any) {
    const result = await imcContext?.polyIMC?.sendMessage(
      windowId,
      IMCMessageTypeEnum.RunExtCommand,
      {
        name: commandName,
        args: args,
      },
    );


    if (result) {
      return result;
    }
  }
  return { runCommand };
}
