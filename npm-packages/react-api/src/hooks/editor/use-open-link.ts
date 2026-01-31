import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

export default function useOpenLink() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<any>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "open-link");

  async function openLink(url: URL) {
    if (!isReady) {
      throw new Error("IMC is not ready");
    }
    await imc?.sendMessage(IMCMessageTypeEnum.EditorOpenLink, {
      url: url.toString(),
    });
  }

  return {
    isReady,
    openLink,
  };
}
