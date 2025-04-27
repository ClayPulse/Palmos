import { EditorContext } from "@/components/providers/editor-context-provider";
import { InterModuleCommunication } from "@pulse-editor/shared-utils";
import { ReceiverHandlerMap } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";

export default function useIMC(
  receiverHandlerMapGetter: () => ReceiverHandlerMap,
) {
  const editorContext = useContext(EditorContext);
  const [imc, setImc] = useState<InterModuleCommunication | undefined>(
    undefined,
  );

  useEffect(() => {
    // Init IMC
    const newImc = new InterModuleCommunication("Pulse Editor Main");
    setImc(newImc);

    return () => {
      console.log("Closing Pulse Editor Main IMC for extension.");
      imc?.close();
    };
  }, []);

  useEffect(() => {
    if (imc) {
      // IMC must be present when initializing the other window
      imc.initThisWindow(window);
      imc.updateReceiverHandlerMap(receiverHandlerMapGetter());
    }
  }, [imc]);

  useEffect(() => {
    imc?.updateReceiverHandlerMap(receiverHandlerMapGetter());
  }, [editorContext]);

  return { imc };
}
