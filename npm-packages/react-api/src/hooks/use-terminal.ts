import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../lib/hooks/use-imc";
import { useEffect, useState } from "react";

export default function useTerminal(moduleName: string) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(moduleName, receiverHandlerMap);
  const [websocketUrl, setWebsocketUrl] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.RequestTerminal).then((response) => {
        const {
          websocketUrl,
        }: {
          websocketUrl: string;
        } = response;

        setWebsocketUrl(websocketUrl);

        imc.sendMessage(IMCMessageTypeEnum.Loaded);
      });
    }
  }, [isReady]);

  return {
    websocketUrl,
  };
}
