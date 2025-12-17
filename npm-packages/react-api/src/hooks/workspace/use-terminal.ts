import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

export default function useTerminal() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "terminal");
  const [websocketUrl, setWebsocketUrl] = useState<string | undefined>(
    undefined,
  );
  const [projectHomePath, setProjectHomePath] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (isReady) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.PlatformCreateTerminal)
        .then((response) => {
          const {
            websocketUrl,
            projectHomePath,
          }: {
            websocketUrl: string;
            projectHomePath: string;
          } = response;

          setWebsocketUrl(websocketUrl);
          setProjectHomePath(projectHomePath);
        });
    }
  }, [isReady]);

  return {
    websocketUrl,
    projectHomePath,
  };
}
