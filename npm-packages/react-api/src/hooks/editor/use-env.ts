import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../../lib/use-imc";

export default function usePulseEnv() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);
  const [envs, setEnvs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.EditorGetEnv).then((env) => {
        setEnvs(env);
      });
    }
  }, [isReady]);

  return {
    isReady,
    envs,
  };
}
