import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useState } from "react";
import useIMC from "../lib/hooks/use-imc";

export default function useTheme() {
  const [theme, setTheme] = useState<string>("light");
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  receiverHandlerMap.set(
    IMCMessageTypeEnum.ThemeChange,
    async (senderWindow: Window, message: IMCMessage) => {
      const theme = message.payload;
      setTheme((prev) => theme);
    }
  );

  const { imc } = useIMC(receiverHandlerMap);

  return {
    theme,
  };
}
