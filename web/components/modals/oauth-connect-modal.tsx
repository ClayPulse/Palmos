import { Button } from "@heroui/react";
import { useContext } from "react";
import { buildOAuthUrl } from "../../lib/auth/oauth";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function OAuthConnectModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);
  const modalState = editorContext?.editorStates.modalStates?.oauthConnect;
  const appName = modalState?.appName ?? "App";
  const appId = modalState?.appId;
  const provider = modalState?.provider ?? "external service";
  const config = modalState?.config;

  async function handleConnect() {
    if (!config) return;
    const authUrl = await buildOAuthUrl(config, appId);
    window.open(authUrl, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Account"
      placement="center"
    >
      <div className="flex w-full flex-col items-center gap-4 pb-4">
        <Icon name="link" className="text-primary text-4xl" />
        <p className="text-center text-sm">
          <strong>{appName}</strong> wants to connect to{" "}
          <strong>{provider}</strong> using OAuth. This will open a new window
          where you can authorize the connection.
        </p>
        <p className="text-foreground-500 text-center text-xs">
          After completing the authorization, close the window to return here.
          Your credentials will be saved securely.
        </p>
        <div className="flex w-full gap-2">
          <Button className="flex-1" variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            color="primary"
            onPress={handleConnect}
            isDisabled={!config}
          >
            Connect
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
