import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";
import { useState } from "react";

/**
 * Use speech-to-speech API to listen to user input and read the output
 * provided by you.
 */
export default function useSpeech2Speech() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);
  const [userInput, setUserInput] = useState<string>("");
  const [isUserStopped, setIsUserStopped] = useState<boolean>(false);

  async function respondAndRead(text: string): Promise<void> {
    if (!imc) {
      throw new Error("IMC is not initialized.");
    }
  }

  return {
    isReady,
    userInput,
    isUserStopped,
    respondAndRead,
  };
}
