import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

/**
 *  Hook for managing file system operations in the editor.
 */

export default function useFileSystem() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >([]);

  const { imc, isReady } = useIMC(receiverHandlerMap, "file-system");

  async function readFile(uri: string) {
    const file: File | undefined = await imc?.sendMessage(
      IMCMessageTypeEnum.PlatformReadFile,
    );

    return file;
  }

  async function writeFile(uri: string, content: string) {
    const newFile: File | undefined = new File([content], uri);

    await imc?.sendMessage(IMCMessageTypeEnum.PlatformWriteFile, {
      uri,
      file: newFile,
    });
  }

  return {
    isReady,
    readFile,
    writeFile,
  };
}
