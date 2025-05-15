import { InterModuleCommunication } from "@pulse-editor/shared-utils";
import {
  IMCMessageTypeEnum,
  ReceiverHandlerMap,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";

export default function useIMC(handlerMap: ReceiverHandlerMap) {
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
    if (!isMounted) return;
    else if (imc !== undefined) return;

    const newImc = new InterModuleCommunication();
    newImc.initThisWindow(window);
    newImc.updateReceiverHandlerMap(handlerMap);
    newImc.initOtherWindow(targetWindow);
    setImc(newImc);

    newImc.sendMessage(IMCMessageTypeEnum.ExtReady).then(() => {
      setIsReady(true);
    });
  }, [isMounted, imc]);

  return {
    imc,
    isReady,
  };
}
