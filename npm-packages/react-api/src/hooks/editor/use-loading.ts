import { useEffect, useState } from "react";
import useIMC from "../../lib/use-imc";
import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";

export default function useLoading() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.EditorLoadingApp, {
        isLoading,
      });
    }
  }, [isLoading]);

  function toggleLoading(isLoading: boolean) {
    setIsLoading((prev) => isLoading);
  }

  return {
    isReady,
    toggleLoading,
  };
}
