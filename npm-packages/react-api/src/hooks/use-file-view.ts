import {
  IMCMessage,
  IMCMessageTypeEnum,
  FileViewModel,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../lib/hooks/use-imc";

export default function useFileView(moduleName: string) {
  const [viewFile, setViewFile] = useState<FileViewModel | undefined>(
    undefined
  );
  const [isLoaded, setIsLoaded] = useState(false);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(moduleName, receiverHandlerMap);

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.RequestViewFile).then((model) => {
        setViewFile(model);
      });
    }
  }, [isReady]);

  useEffect(() => {
    if (isLoaded) {
      imc?.sendMessage(IMCMessageTypeEnum.Loaded);
    }
  }, [isLoaded, imc]);

  function updateViewFile(file: FileViewModel) {
    // sender.sendMessage(ViewBoxMessageTypeEnum.ViewFile, JSON.stringify(file));
    imc?.sendMessage(IMCMessageTypeEnum.WriteViewFile, file);
  }

  return {
    viewFile,
    updateViewFile,
    setIsLoaded,
  };
}
