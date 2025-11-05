import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import useIMC from "../imc/use-imc";

/**
 *
 * @param uri The file URI to read/write
 * @param debounce Debounce time in ms for write operations
 * @returns
 */
export default function useFile(uri: string | undefined, debounce = 0) {
  const [file, setFile] = useState<File | undefined>(undefined);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >([
    [
      IMCMessageTypeEnum.PlatformFileUpdate,
      async (senderWindow: Window, message: IMCMessage) => {
        const updatedFile = message.payload as File;
        setFile(updatedFile);
      },
    ],
  ]);

  const { imc, isReady } = useIMC(receiverHandlerMap, "file");

  const sendFileDebounced = useDebouncedCallback(
    async (newFile: File) => {
      if (!isReady || !uri) return;
      await imc?.sendMessage(IMCMessageTypeEnum.PlatformWriteFile, {
        uri,
        file: newFile,
      });
    },
    debounce,
    { maxWait: debounce * 2 },
  );

  const saveFile = useCallback(
    async (fileContent: string) => {
      if (!uri || !file) return;

      const newFile = new File([fileContent], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      setFile(newFile);

      // ✅ This now waits until the debounced write actually finishes
      await sendFileDebounced(newFile);
    },
    [file, uri, sendFileDebounced],
  );

  // Read file when uri changes
  useEffect(() => {
    if (isReady && uri) {
      imc
        ?.sendMessage(IMCMessageTypeEnum.PlatformReadFile, {
          uri,
        })
        .then((f: File | undefined) => {
          setFile(f);
        });
    }
  }, [isReady, uri]);

  return {
    file,
    saveFile,
  };
}
