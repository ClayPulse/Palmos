import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";
import { useEffect, useState } from "react";

export default function useTerminal() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);
  const [websocketUrl, setWebsocketUrl] = useState<string | undefined>(
    undefined
  );
  const [projectHomePath, setProjectHomePath] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.RequestTerminal).then((response) => {
        const {
          websocketUrl,
          projectHomePath,
        }: {
          websocketUrl: string;
          projectHomePath: string;
        } = response;

        setWebsocketUrl(websocketUrl);
        setProjectHomePath(projectHomePath);

        imc.sendMessage(IMCMessageTypeEnum.Loaded);
      });
    }
  }, [isReady]);

  return {
    websocketUrl,
    projectHomePath,
  };
}
