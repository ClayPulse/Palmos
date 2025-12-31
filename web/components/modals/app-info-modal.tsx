import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppInfoModalContent } from "@/lib/types";
import { addToast, Button, Divider, Input } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import useSWR from "swr";
import EnvInput from "../misc/env-input";
import Icon from "../misc/icon";
import MarkdownRender from "../misc/markdown-render";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function AppInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const [isDeveloperSettingsOpen, setIsDeveloperSettingsOpen] = useState(false);

  const appInfo = editorContext?.editorStates.modalStates?.appInfo?.content;

  if (!appInfo) {
    return null;
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={isDeveloperSettingsOpen ? "Developer Settings" : appInfo.name}
      isShowGoBack
      goBackCallback={() => {
        if (isDeveloperSettingsOpen) {
          setIsDeveloperSettingsOpen(false);
        } else {
          editorContext?.updateModalStates({
            appInfo: { isOpen: false },
            marketplace: { isOpen: true },
          });
        }
      }}
    >
      <div className="grid-rows[auto_max-content] grid h-full gap-y-1">
        {isDeveloperSettingsOpen ? (
          <DeveloperSettings appInfo={appInfo} />
        ) : (
          <AppInfo
            appInfo={appInfo}
            setIsDeveloperSettingsOpen={setIsDeveloperSettingsOpen}
          />
        )}
      </div>
    </ModalWrapper>
  );
}

function AppInfo({
  appInfo,
  setIsDeveloperSettingsOpen,
}: {
  appInfo: AppInfoModalContent;
  setIsDeveloperSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [isAuthor, setIsAuthor] = useState(false);

  // Check if the current user is the author of the app
  useEffect(() => {
    async function getAuthorStatus() {
      const response = await fetchAPI("/api/app/is-author", {
        method: "POST",
        body: JSON.stringify({
          id: appInfo?.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { isAuthor } = await response.json();

      setIsAuthor(isAuthor);
    }

    setIsAuthor(false);
    if (appInfo) {
      getAuthorStatus();
    }
  }, [appInfo]);

  return (
    <>
      <div className="flex w-full flex-col overflow-y-auto">
        <p>
          <span className="font-semibold">ID</span>: {appInfo?.id}
        </p>
        <p>
          <span className="font-semibold">Version</span>: {appInfo?.version}
        </p>
        {appInfo?.author && (
          <p>
            <span className="font-semibold">Author</span>: {appInfo?.author}
          </p>
        )}
        {appInfo?.license && (
          <p>
            <span className="font-semibold">License</span>: {appInfo?.license}
          </p>
        )}
        {appInfo?.url && (
          <p>
            <span className="font-semibold">Website</span>:{" "}
            <a href={appInfo.url} className="underline">
              {appInfo.url}
            </a>
          </p>
        )}
        <Divider />
        {appInfo?.readme && (
          <div>
            <p>
              <span className="font-semibold">README</span>:
            </p>
            <MarkdownRender content={appInfo.readme} />
          </div>
        )}
      </div>
      {isAuthor && (
        <Button
          color="primary"
          onPress={() => setIsDeveloperSettingsOpen(true)}
        >
          Developer Settings
        </Button>
      )}
    </>
  );
}

function DeveloperSettings({ appInfo }: { appInfo: AppInfoModalContent }) {
  const { data: envs, mutate } = useSWR<
    {
      key: string;
      value: string;
      isSecret: boolean;
    }[]
  >(`/api/app/settings/env/list?id=${appInfo.id}`, async (url: string) => {
    const response = await fetchAPI(url);
    const data = await response.json();
    return data;
  });

  const [newEnvKey, setNewEnvKey] = useState<string>("");
  const [newEnvValue, setNewEnvValue] = useState<string>("");
  const [isSecret, setIsSecret] = useState<boolean>(false);

  return (
    <div className="flex w-full flex-col overflow-y-auto p-1">
      <p>
        <span className="font-semibold">App ID</span>: {appInfo.id}
      </p>
      {envs && envs.length > 0 && (
        <div className="space-y-1">
          {envs?.map((env) => (
            <EnvInput
              key={env.key}
              env={env}
              appId={appInfo.id}
              onUpdated={() => {
                mutate();
              }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-x-1">
        <Input
          label="Add New Variable"
          size="sm"
          value={newEnvKey}
          onValueChange={setNewEnvKey}
        />
        <Input
          label="Value"
          size="sm"
          value={newEnvValue}
          onValueChange={setNewEnvValue}
          type={isSecret ? "password" : "text"}
        />
        <Button
          isIconOnly
          variant="light"
          onPress={() => setIsSecret((prev) => !prev)}
        >
          {isSecret ? <Icon name="lock" /> : <Icon name="lock_open" />}
        </Button>
        <Button
          isIconOnly
          variant="light"
          onPress={async () => {
            if (newEnvKey.trim() === "") {
              addToast({
                title: "Error",
                description: "Environment variable key cannot be empty.",
                color: "danger",
              });
              return;
            }

            addToast({
              title: "Adding Variable",
              description: `Adding environment variable ${newEnvKey}.`,
            });
            await fetchAPI("/api/app/settings/env/set", {
              method: "POST",
              body: JSON.stringify({
                appId: appInfo.id,
                key: newEnvKey,
                value: newEnvValue,
                isSecret: isSecret,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            });

            mutate();
            setNewEnvKey("");
            setNewEnvValue("");
            setIsSecret(false);

            addToast({
              title: "Variable Added",
              description: `Environment variable ${newEnvKey} added successfully.`,
              color: "success",
            });
          }}
        >
          <Icon name="add" />
        </Button>
      </div>
    </div>
  );
}
