import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";

import useIMC from "../lib/use-imc";

export default function useFetch() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc } = useIMC(receiverHandlerMap);

  function fetch(uri: string, options?: RequestInit): Promise<Response> {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }

    return imc.sendMessage(
      IMCMessageTypeEnum.Fetch,
      JSON.stringify({ uri, options })
    );
  }

  return { fetch };
}
