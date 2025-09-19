import {
  CommandInfo,
  IMCMessage,
  IMCMessageTypeEnum,
  ReceiverHandler,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";
import { useEffect, useState } from "react";

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
  callbackHandler?: (args: any) => Promise<string | void>
) {
  const { isReady, imc } = useIMC(getReceiverHandlerMap());

  const [handler, setHandler] = useState<
    ((args: any) => Promise<any>) | undefined
  >(undefined);

  function getReceiverHandlerMap() {
    const receiverHandlerMap = new Map<IMCMessageTypeEnum, ReceiverHandler>([
      [
        IMCMessageTypeEnum.EditorRunExtCommand,
        async (senderWindow: Window, message: IMCMessage) => {
          if (!commandInfo) {
            throw new Error("Extension command is not available");
          }

          const {
            name,
            args,
          }: {
            name: string;
            args: any;
          } = message.payload;

          if (name === commandInfo.name) {
            // Check if the parameters match the command's parameters
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

            // Execute the command handler with the parameters
            if (handler) {
              const res = await handler(args);
              if (res) {
                return res;
              }
            }
          }
        },
      ],
    ]);
    return receiverHandlerMap;
  }

  useEffect(() => {
    imc?.updateReceiverHandlerMap(getReceiverHandlerMap());
  }, [handler, imc]);

  useEffect(() => {
    setHandler(() => callbackHandler);
  }, [callbackHandler]);

  return {
    isReady,
  };
}
