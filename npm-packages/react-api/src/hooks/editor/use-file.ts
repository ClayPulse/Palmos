import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import { useCallback, useEffect, useState } from "react";
import useIMC from "../imc/use-imc";

export default function useFile(uri: string | undefined) {
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

  const { imc, isReady } = useIMC(receiverHandlerMap);

  const saveFile = useCallback(
    (fileContent: string) => {
      if (!uri) return;
      else if (!file) return;

      // Update file content
      const newFile = new File([fileContent], file.name, {
        type: file.type,
        lastModified: Date.now(),
      });
      setFile(newFile);

      if (isReady && uri) {
        imc?.sendMessage(IMCMessageTypeEnum.PlatformWriteFile, {
          uri,
          file: newFile,
        });
      }
    },
    [uri, file, isReady]
  );

  // Read file when uri changes
  useEffect(() => {
    if (isReady) {
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
