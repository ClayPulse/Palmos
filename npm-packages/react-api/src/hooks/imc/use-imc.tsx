import {
  IMCMessageTypeEnum,
  InterModuleCommunication,
  ReceiverHandlerMap,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import { v4 } from "uuid";

export default function useIMC(handlerMap: ReceiverHandlerMap, intent: string) {
  const [imc, setImc] = useState<InterModuleCommunication | undefined>(
    undefined
  );
  const [isReady, setIsReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const targetWindow = window.parent;

  useEffect(() => {
    setIsMounted(true);

    return () => {
      setIsMounted(false);
      imc?.close();
      setImc(undefined);
    };
  }, []);

  useEffect(() => {
    async function initIMC() {
      if (!isMounted) return;
      else if (imc !== undefined) return;

      const newImc = new InterModuleCommunication("use-imc", v4());
      newImc.initThisWindow(window);
      newImc.updateReceiverHandlerMap(handlerMap);
      await newImc.initOtherWindow(targetWindow);
      setImc(newImc);

      await newImc.sendMessage(IMCMessageTypeEnum.AppReady, {
        intent,
        channelId: newImc.channelId,
      });
      setIsReady(true);
    }

    initIMC();
  }, [isMounted, imc]);

  return {
    imc,
    isReady,
  };
}
