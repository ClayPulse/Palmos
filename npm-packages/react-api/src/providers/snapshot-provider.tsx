import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
import useIMC from "../lib/use-imc";

export const SnapshotContext = createContext<SnapshotContextType | undefined>(
  undefined
);

export type SnapshotContextType = {
  states: { [key: string]: any };
  setStates: Dispatch<SetStateAction<{ [key: string]: any }>>;
};

export default function SnapshotProvider({
  children,
}: {
  children: ReactNode;
}) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<any>
  >([
    [
      IMCMessageTypeEnum.EditorAppStateSnapshotRestore,
      async (senderWindow: Window, message: IMCMessage) => {
        const { states } = message.payload;

        // Update all states in the context
        setStates((prev) => ({ ...states }));
      },
    ],
    [
      IMCMessageTypeEnum.EditorAppStateSnapshotSave,
      async (senderWindow: Window, message: IMCMessage) => {
        // Return current states in the context
        return { states };
      },
    ],
  ]);

  const { imc, isReady } = useIMC(receiverHandlerMap);

  const [states, setStates] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    if (isReady) {
      imc?.updateReceiverHandlerMap(receiverHandlerMap);
    }
  }, [isReady, states]);

  return (
    <SnapshotContext.Provider value={{ states, setStates }}>
      {children}
    </SnapshotContext.Provider>
  );
}
