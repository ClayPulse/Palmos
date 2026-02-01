import { PlatformEnum } from "@/lib/enums";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { Button, Divider, Input } from "@heroui/react";
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from '@/lib/hooks/use-translations';
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function LoginModal({
  signIn,
  isOpen,
  onClose,
}: {
    signIn: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  const [workspaceAddress, setWorkspaceAddress] = useState<string | undefined>(
    undefined,
  );

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => {
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isSigningIn: false,
        }));
        onClose();
      }}
      title={t('loginModal.title')}
      placement={"center"}
    >
      <div className="flex w-full flex-col gap-2">
        <p>{t('loginModal.title')}</p>
        <Button color="primary" onPress={() => signIn()}>
          {t('loginModal.login')}
        </Button>

        <Divider />
        <p>{t('loginModal.connectToRemote')}</p>

        <Input
          label={t('loginModal.remoteUrl')}
          placeholder={t('loginModal.remoteUrlPlaceholder')}
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
                    cpuLimit: "N/A",
                    memoryLimit: "N/A",
                    volumeSize: "N/A",
                  },
                };
              });
            }
          }}
        >
          {t('loginModal.connect')}
        </Button>

        <Button
          onPress={() => {
            const platform = getPlatform();
            if (platform === "web") {
              toast.error(
                t('loginModal.localWorkspaceNotAvailable'),
              );
            }

            onClose();

            editorContext?.setEditorStates((prev) => {
              return {
                ...prev,
                isSigningIn: false,
              };
            });
          }}
        >
          {getPlatform() === PlatformEnum.Web ||
          getPlatform() === PlatformEnum.WebMobile
            ? t('loginModal.continueAsGuest')
            : t('loginModal.continueOffline')}
        </Button>
      </div>
    </ModalWrapper>
  );
}
