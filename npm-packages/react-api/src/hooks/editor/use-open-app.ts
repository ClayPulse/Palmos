import { IMCMessage, IMCMessageTypeEnum } from "@pulse-editor/shared-utils";
import useIMC from "../imc/use-imc";

export default function useOpenApp() {
  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<any>
  >();

  const { imc, isReady } = useIMC(receiverHandlerMap, "open-app");

  async function openApp(appId: string, location: "canvas", version?: string) {
    if (!isReady) {
      throw new Error("IMC is not ready");
    }
    await imc?.sendMessage(IMCMessageTypeEnum.EditorOpenApp, {
      appId,
      version,
      location,
    });
  }

  return {
    isReady,
    openApp,
  };
}
