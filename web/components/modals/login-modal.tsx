import { Button, Divider, Input } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import ModalWrapper from "./modal-wrapper";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import toast from "react-hot-toast";
import { PlatformEnum } from "@/lib/types";

export default function LoginModal({ signIn }: { signIn: () => void }) {
  const editorContext = useContext(EditorContext);
  const [workspaceAddress, setWorkspaceAddress] = useState<string | undefined>(
    undefined,
  );

  const [isModelOpen, setIsModelOpen] = useState(false);

  // Open remote instance selection if the current platform is web
  useEffect(() => {
    if (!editorContext?.editorStates?.currentWorkspace) {
      setIsModelOpen(true);
    }
  }, [editorContext?.editorStates?.currentWorkspace]);

  return (
    <ModalWrapper
      isOpen={isModelOpen}
      setIsOpen={setIsModelOpen}
      title={"Access Pulse Editor Workspace"}
      placement={"center"}
    >
      <div className="flex w-full flex-col gap-2">
        <p>Access Pulse Editor Cloud Workspace</p>
        <Button color="primary" onPress={() => signIn()}>
          Login
        </Button>

        <Divider />
        <p>Connect to Self-hosted Remote Workspace</p>

        <Input
          label="Remote Workspace Address"
          placeholder="e.g. http://localhost:3000"
          value={workspaceAddress}
          onChange={(e) => setWorkspaceAddress((prev) => e.target.value)}
        />

        <Button
          onPress={() => {
            if (workspaceAddress) {
              editorContext?.setEditorStates((prev) => {
                return {
                  ...prev,
                  currentWorkspace: {
                    id: "self-hosted",
                    name: "Self-hosted Workspace",
                    address: workspaceAddress,
                  },
                };
              });
            }
          }}
        >
          Connect
        </Button>

        <Button
          onPress={() => {
            const platform = getPlatform();
            if (platform === "web") {
              toast.error(
                "Local workspace is not available in browser. Please use the desktop/mobile client, or connect to a remote instance.",
              );
            }

            setIsModelOpen(false);

            editorContext?.setEditorStates((prev) => {
              return {
                ...prev,
                isSigningIn: false,
              };
            });
          }}
        >
          {getPlatform() === PlatformEnum.Web
            ? "Continue as Guest"
            : "Continue Offline"}
        </Button>
      </div>
    </ModalWrapper>
  );
}
