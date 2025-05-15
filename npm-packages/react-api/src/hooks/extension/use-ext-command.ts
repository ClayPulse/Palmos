import {
  ExtensionCommand,
  IMCMessage,
  IMCMessageTypeEnum,
  TypedVariable,
} from "@pulse-editor/shared-utils";
import useIMC from "../../lib/use-imc";

/**
 * Register an extension command to listen to IMC messages from the core,
 * and pass to the extension to handle.
 */
export default function useExtCommand(
  command: ExtensionCommand
) {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >([
    [
      IMCMessageTypeEnum.RunExtCommand,
      async (senderWindow: Window, message: IMCMessage) => {
        const {
          name,
          args,
        }: {
          name: string;
          args: Record<string, TypedVariable>;
        } = message.payload;

        if (name === command.info.name) {
          // Check if the parameters match the command's parameters
          const commandParameters = command.info.parameters;
          if (
            Object.keys(args).length !==
            Object.keys(commandParameters).length
          ) {
            throw new Error(
              `Invalid number of parameters: expected ${
                Object.keys(commandParameters).length
              }, got ${Object.keys(args).length}`
            );
          }
          for (const [key, value] of Object.entries(args)) {
            if (command.info.parameters[key] === undefined) {
              throw new Error(`Invalid parameter: ${key}`);
            }
            if (value.type !== command.info.parameters[key].type) {
              throw new Error(
                `Invalid type for parameter ${key}: expected ${command.info.parameters[key].type}, got ${value.type}`
              );
            }
          }

          // Execute the command handler with the parameters
          command.handler(args);
        }
      },
    ],
  ]);

  const { isReady } = useIMC(receiverHandlerMap);

  return {
    isReady,
  };
}
