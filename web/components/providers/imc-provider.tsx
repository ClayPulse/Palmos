"use client";

import { IMCContextType } from "@/lib/types";
import {
  IMCMessage,
  IMCMessageTypeEnum,
  InterModuleCommunication,
} from "@pulse-editor/shared-utils";
import { createContext, useEffect, useState } from "react";

export const IMCContext = createContext<IMCContextType | undefined>(undefined);

export default function InterModuleCommunicationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [imc, setImc] = useState<InterModuleCommunication | undefined>(
    undefined,
  );

  const [connectedModuleIds, setConnectedModuleIds] = useState<string[]>([]);

  useEffect(() => {
    const newImc = new InterModuleCommunication("Pulse Editor Main");
    newImc.initThisWindow(window);
    newImc.updateReceiverHandlerMap(getHandlerMap());
    setImc(newImc);
  }, []);

  function getHandlerMap() {
    const newMap = new Map<
      IMCMessageTypeEnum,
      {
        (
          senderWindow: Window,
          message: IMCMessage,
          abortSignal?: AbortSignal,
        ): Promise<any>;
      }
    >();

    newMap.set(
      IMCMessageTypeEnum.Ready,
      async (
        senderWindow: Window,
        message: IMCMessage,
        abortSignal?: AbortSignal,
      ) => {
        const moduleId = message.id;

        if (connectedModuleIds.includes(moduleId)) {
          console.warn(
            `Module with id ${moduleId} is already connected. Ignoring duplicate connection.`,
          );
          return;
        }

        setConnectedModuleIds((prev) => [...prev, moduleId]);

        // Handle the ready message
        console.log("Received ready message from extension:", message);
      },
    );

    return newMap;
  }

  return (
    <IMCContext.Provider
      value={{
        connectedModuleIds: connectedModuleIds,
      }}
    >
      {children}
    </IMCContext.Provider>
  );
}
