import {
  CommandInfo,
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
} from "@pulse-editor/shared-utils";
import { useEffect, useRef, useState } from "react";
import useIMC from "../../lib/use-imc";

/**
 * Register an extension command to listen to IMC messages from the core,
 * and pass to the extension to handle.
 *
 * @param commandInfo Command information to register.
 * @param callbackHandler Callback handler function to handle the command.
 *
 */
export default function useCommand(
  commandInfo: CommandInfo,
  callbackHandler?: (args: any) => Promise<string | void>,
  isExtReady: boolean = true
) {
  const { isReady, imc } = useIMC(getReceiverHandlerMap());

  const [handler, setHandler] = useState<
    ((args: any) => Promise<any>) | undefined
  >(undefined);

  // Queue to hold commands until extension is ready
  const commandQueue = useRef<{ args: any; resolve: (v: any) => void }[]>([]);

  async function executeCommand(args: any) {
    if (!handler) return;

    const res = await handler(args);
    return res;
  }

  function getReceiverHandlerMap() {
    const receiverHandlerMap = new Map<IMCMessageTypeEnum, ReceiverHandler>([
      [
        IMCMessageTypeEnum.EditorRunExtCommand,
        async (_senderWindow: Window, message: IMCMessage) => {
          if (!commandInfo) {
            throw new Error("Extension command is not available");
          }

          const { name, args }: { name: string; args: any } = message.payload;

          if (name === commandInfo.name) {
            // Validate parameters
            const commandParameters = commandInfo.parameters;
            if (
              Object.keys(args).length !== Object.keys(commandParameters).length
            ) {
              throw new Error(
                `Invalid number of parameters: expected ${
                  Object.keys(commandParameters).length
                }, got ${Object.keys(args).length}`
              );
            }

            for (const [key, value] of Object.entries(args)) {
              if (commandInfo.parameters[key] === undefined) {
                throw new Error(`Invalid parameter: ${key}`);
              }
              if (typeof value !== commandInfo.parameters[key].type) {
                throw new Error(
                  `Invalid type for parameter ${key}: expected ${
                    commandInfo.parameters[key].type
                  }, got ${typeof value}. Value received: ${value}`
                );
              }
            }

            // If extension is ready, execute immediately
            if (isExtReady) {
              return await executeCommand(args);
            }

            // Otherwise, queue the command and return when executed
            return new Promise((resolve) => {
              commandQueue.current.push({ args, resolve });
            });
          }
        },
      ],
    ]);
    return receiverHandlerMap;
  }

  // Flush queued commands when isExtReady becomes true
  useEffect(() => {
    if (isExtReady && commandQueue.current.length > 0) {
      const pending = [...commandQueue.current];
      commandQueue.current = [];
      pending.forEach(async ({ args, resolve }) => {
        const res = await executeCommand(args);
        resolve(res);
      });
    }
  }, [isExtReady]);

  useEffect(() => {
    imc?.updateReceiverHandlerMap(getReceiverHandlerMap());
  }, [handler, imc, isExtReady]);

  useEffect(() => {
    setHandler(() => callbackHandler);
  }, [callbackHandler]);

  return {
    isReady,
  };
}
