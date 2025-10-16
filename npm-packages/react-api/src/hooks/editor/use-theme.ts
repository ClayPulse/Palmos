import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

export default function useTheme() {
  const [theme, setTheme] = useState<string>("light");
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  receiverHandlerMap.set(
    IMCMessageTypeEnum.EditorThemeUpdate,
    async (senderWindow: Window, message: IMCMessage) => {
      const theme = message.payload;
      setTheme((prev) => theme);
    }
  );

  const { imc, isReady } = useIMC(receiverHandlerMap);

  // Upon initial load, request theme from main app
  useEffect(() => {
    if (isReady) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.EditorAppRequestTheme)
        .then((result) => {
          setTheme((prev) => result);
        });
    }
  }, [isReady]);

  return {
    theme,
  };
}
