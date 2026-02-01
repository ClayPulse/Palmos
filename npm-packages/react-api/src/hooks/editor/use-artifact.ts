import {
  Artifact,
  IMCMessage,
  IMCMessageTypeEnum,
} from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

export function useArtifact() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "artifact");

  function sendArtifact(artifact: Artifact) {
    if (isReady) {
      imc?.sendMessage(IMCMessageTypeEnum.EditorArtifactUpdate, artifact);
    }
  }

  return {
    isReady,
    sendArtifact,
  };
}
