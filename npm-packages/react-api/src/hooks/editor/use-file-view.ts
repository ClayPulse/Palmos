import {
  IMCMessage,
  IMCMessageTypeEnum,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../../lib/use-imc";

export default function useFileView() {
  const [viewModel, setViewModel] = useState<ViewModel | undefined>(undefined);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap);

  useEffect(() => {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.PlatformReadFile).then((model) => {
        setViewModel(model);
      });
    }
  }, [isReady]);

  function updateViewModel(viewModel: ViewModel) {
    imc?.sendMessage(IMCMessageTypeEnum.PlatformWriteFile, viewModel);
  }

  return {
    viewModel,
    updateViewModel,
  };
}
