import {
  IMCMessage,
  IMCMessageTypeEnum,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../../lib/use-imc";

export default function useFileView() {
  const [viewModel, setViewModel] = useState<ViewModel | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.RequestViewFile).then((model) => {
        setViewModel(model);
      });
    }
  }, [isReady]);

  useEffect(() => {
    if (isLoaded) {
      imc?.sendMessage(IMCMessageTypeEnum.Loaded);
    }
  }, [isLoaded, imc]);

  function updateViewModel(viewModel: ViewModel) {
    // sender.sendMessage(ViewBoxMessageTypeEnum.ViewFile, JSON.stringify(file));
    imc?.sendMessage(IMCMessageTypeEnum.WriteViewFile, viewModel);
  }

  return {
    viewModel,
    updateViewModel,
    setIsLoaded,
  };
}
