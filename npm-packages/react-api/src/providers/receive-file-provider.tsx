import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import React, { createContext, ReactNode, useState } from "react";
import useIMC from "../hooks/imc/use-imc";

export const ReceiveFileContext = createContext<
  ReceiveFileContextType | undefined
>(undefined);

export type ReceiveFileContextType = {
  // Define any state or functions you want to provide here
  selectedFileUri: string | undefined;
};

export default function ReceiveFileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [receivedFileUri, setReceivedFileUri] = useState<string | undefined>(
    undefined
  );

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<any>
  >([
    [
      IMCMessageTypeEnum.EditorAppReceiveFileUri,
      async (senderWindow: Window, message: IMCMessage) => {
        const { uri } = message.payload;
        setReceivedFileUri((prev) => uri);
      },
    ],
  ]);
  useIMC(receiverHandlerMap, "receive-file-provider");

  return (
    <ReceiveFileContext.Provider value={{ selectedFileUri: receivedFileUri }}>
      {children}
    </ReceiveFileContext.Provider>
  );
}
