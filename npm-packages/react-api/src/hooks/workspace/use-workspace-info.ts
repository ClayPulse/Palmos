import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

export default function useWorkspaceInfo() {
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "theme");

  // Upon initial load, request theme from main app
  useEffect(() => {
    if (isReady) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.EditorAppRequestWorkspace)
        .then((result) => {
          const { id }: { id: string } = result;
          setWorkspaceId((prev) => id);
        });
    }
  }, [isReady]);

  return {
    workspaceId,
  };
}
