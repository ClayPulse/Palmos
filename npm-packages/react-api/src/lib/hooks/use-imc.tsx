import { InterModuleCommunication } from "@pulse-editor/shared-utils";
import {
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandlerMap,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";

export default function useIMC(
  moduleName: string,
  handlerMap: ReceiverHandlerMap
) {
  const [imc, setImc] = useState<InterModuleCommunication | undefined>(
    undefined
  );
  const [isReady, setIsReady] = useState(false);

  const targetWindow = window.parent;

  useEffect(() => {
    const imc = new InterModuleCommunication(moduleName);
    imc.initThisWindow(window);
    imc.updateReceiverHandlerMap(handlerMap);
    imc.initOtherWindow(targetWindow);
    setImc(imc);

    imc.sendMessage(IMCMessageTypeEnum.Ready).then(() => {
      setIsReady(true);
    });

    return () => {
      imc.close();
    };
  }, []);

  return {
    imc,
    isReady,
  };
}
