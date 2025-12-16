import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

/**
 * Hook to access editor environment variables in the frontend (saved in storage).
 * @returns
 */
export default function useEditorEnv() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "env");
  const [envs, setEnvs] = useState<Record<string, string>>(
    // default to process env
    process.env as Record<string, string>,
  );

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.EditorGetEnv).then((env) => {
        // Create or update envs state
        setEnvs((prev) => ({
          ...prev,
          ...env,
        }));
      });
    }
  }, [isReady]);

  return {
    isReady,
    envs,
  };
}
