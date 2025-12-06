import {
  FileSystemObject,
  IMCMessage,
  IMCMessageTypeEnum,
  ListPathOptions,
} from "@pulse-editor/shared-utils";
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

  async function listPath(uri: string, options?: ListPathOptions) {
    const result: FileSystemObject[] =
      (await imc?.sendMessage(IMCMessageTypeEnum.PlatformListPath, {
        uri,
        options,
      })) ?? [];
    return result;
  }

  async function createFolder(uri: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.PlatformCreateFolder, { uri });
  }

  async function createFile(uri: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.PlatformCreateFile, { uri });
  }

  async function rename(oldUri: string, newUri: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.PlatformRename, {
      oldUri,
      newUri,
    });
  }

  async function deletePath(uri: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.PlatformDelete, { uri });
  }

  async function hasPath(uri: string) {
    const exists: boolean =
      (await imc?.sendMessage(IMCMessageTypeEnum.PlatformHasPath, { uri })) ??
      false;
    return !!exists;
  }

  async function copyFiles(from: string, to: string) {
    await imc?.sendMessage(IMCMessageTypeEnum.PlatformCopyFiles, { from, to });
  }

  async function readFile(uri: string) {
    const file: File | undefined = await imc?.sendMessage(
      IMCMessageTypeEnum.PlatformReadFile,
      { uri },
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
    listPath,
    createFolder,
    createFile,
    rename,
    deletePath,
    hasPath,
    copyFiles,
    readFile,
    writeFile,
  };
}
