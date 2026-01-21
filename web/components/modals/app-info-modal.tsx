import { listRemoteServerFunctions } from "@/lib/module-federation/remote";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppInfoModalContent } from "@/lib/types";
import { addToast, Button, Chip, Divider, Input, Spinner } from "@heroui/react";
import { useContext, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import EnvInput from "../misc/env-input";
import Icon from "../misc/icon";
import MarkdownRender from "../misc/markdown-render";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

type EndPointInfo = {
  endpoint: string;
  cost?: number;
};

export default function AppInfoModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const [isDeveloperSettingsOpen, setIsDeveloperSettingsOpen] = useState(false);

  // const [functions, setFunctions] = useState<
  //   {
  //     endpoint: string;
  //     cost?: number;
  //   }[]
  // >([]);

  // const [isLoadingFunctions, setIsLoadingFunctions] = useState(false);

  // useEffect(() => {
  //   async function fetchFunctions() {
  //     const app = editorContext?.persistSettings?.extensions?.find(
  //       (ext) => ext.config.id === appInfo.id,
  //     );

  //     setIsLoadingFunctions(true);
  //     const funcNames = await listRemoteServerFunctions(
  //       appInfo.id,
  //       appInfo.version,
  //       app?.remoteOrigin,
  //     );

  //     const url = getAPIUrl("/api/app/settings/cost/get");
  //     url.searchParams.append("appId", appInfo.id);

  //     const funcCosts: {
  //       endpoint: string;
  //       cost: number;
  //     }[] = await (await fetchAPI(url)).json();

  //     const funcNamesWithCosts = funcNames.map((funcName) => {
  //       const costEntry = funcCosts.find((fc) => fc.endpoint === funcName);
  //       return {
  //         endpoint: funcName,
  //         cost: costEntry ? costEntry.cost : undefined,
  //       };
  //     });

  //     setFunctions(funcNamesWithCosts);
  //     setIsLoadingFunctions(false);
  //   }

  //   fetchFunctions();
  // }, [appInfo]);

  const appInfo = editorContext?.editorStates.modalStates?.appInfo?.content;

  const { data: functions, isLoading: isLoadingEndpoints } = useSWR<
    EndPointInfo[]
  >(
    appInfo ? `/api/app/settings/cost/get?appId=${appInfo.id}` : null,
    async (url: string) => {
      if (!appInfo) {
        return [];
      }

      const response = await fetchAPI(url);
      const funcCosts: {
        endpoint: string;
        cost: number;
      }[] = await response.json();

      const app = editorContext?.persistSettings?.extensions?.find(
        (ext) => ext.config.id === appInfo.id,
      );

      const funcNames = await listRemoteServerFunctions(
        appInfo.id,
        appInfo.version,
        app?.remoteOrigin,
      );

      const funcNamesWithCosts = funcNames.map((funcName) => {
        const costEntry = funcCosts.find((fc) => fc.endpoint === funcName);
        return {
          endpoint: funcName,
          cost: costEntry ? costEntry.cost : undefined,
        };
      });

      return funcNamesWithCosts;
    },
  );

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
          <DeveloperSettings
            appInfo={appInfo}
            funcNamesWithCosts={functions ?? []}
            isLoadingEndpoints={isLoadingEndpoints}
          />
        ) : (
          <AppInfo
            appInfo={appInfo}
            setIsDeveloperSettingsOpen={setIsDeveloperSettingsOpen}
            funcNamesWithCosts={functions ?? []}
            isLoadingEndpoints={isLoadingEndpoints}
          />
        )}
      </div>
    </ModalWrapper>
  );
}

function AppInfo({
  appInfo,
  setIsDeveloperSettingsOpen,
  funcNamesWithCosts,
  isLoadingEndpoints,
}: {
  appInfo: AppInfoModalContent;
  setIsDeveloperSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  funcNamesWithCosts: EndPointInfo[];
  isLoadingEndpoints: boolean;
}) {
  const [isAuthor, setIsAuthor] = useState(false);

  const filteredFuncNamesWithCosts = useMemo(() => {
    return funcNamesWithCosts.filter((func) => func.cost !== undefined);
  }, [funcNamesWithCosts]);

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
        {appInfo?.readme && (
          <div>
            <Divider />
            <p>
              <span className="font-semibold">README</span>:
            </p>
            <MarkdownRender content={appInfo.readme} />
          </div>
        )}
      </div>

      {isLoadingEndpoints ? (
        <Spinner />
      ) : (
        <div className="">
          {filteredFuncNamesWithCosts.length > 0 ? (
            <div>
              <Divider />
              <h3 className="text-center text-lg font-semibold">API Pricing</h3>
              <p className="text-default-foreground/60 text-center">
                The following are the API pricing settings for this app.
              </p>
              <div className="flex flex-col gap-y-2">
                {filteredFuncNamesWithCosts.map((func) => (
                  <div key={func.endpoint} className="flex flex-col">
                    <p className="font-semibold">Endpoint: </p>
                    <p>{func.endpoint}</p>

                    <div className="flex gap-x-1">
                      <p className="font-semibold">Cost: </p>
                      <Chip variant="flat" color="primary">
                        {func.cost} credits{" "}
                      </Chip>
                      <p>per call</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Divider />
              <p className="text-center">No API pricing set for this app.</p>
            </div>
          )}
        </div>
      )}

      {isAuthor && (
        <>
          <Divider />
          <Button
            color="primary"
            onPress={() => setIsDeveloperSettingsOpen(true)}
          >
            Developer Settings
          </Button>
        </>
      )}
    </>
  );
}

function DeveloperSettings({
  appInfo,
  funcNamesWithCosts,
  isLoadingEndpoints,
}: {
  appInfo: AppInfoModalContent;
  funcNamesWithCosts: EndPointInfo[];
  isLoadingEndpoints: boolean;
}) {
  const editorContext = useContext(EditorContext);

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
  const [isShowConfirmUnpublish, setIsShowConfirmUnpublish] = useState(false);

  return (
    <div className="flex w-full flex-col gap-y-2 overflow-y-auto p-1">
      <h3 className="text-center text-lg font-semibold">App Info</h3>
      <p>
        <span className="font-semibold">App ID</span>: {appInfo.id}
      </p>
      <Divider />
      <h3 className="text-center text-lg font-semibold">
        Environment Variables
      </h3>
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
      <Divider />

      <h3 className="text-center text-lg font-semibold">API Pricing</h3>
      <p className="text-default-foreground/60 text-center">
        You can set up credits cost for calls made to your app's APIs here. Once
        set, you cannot change it again.
      </p>

      {isLoadingEndpoints ? (
        <Spinner />
      ) : (
        funcNamesWithCosts.length === 0 && (
          <p className="text-center">No server functions found for this app.</p>
        )
      )}
      <div className="flex flex-col gap-y-2">
        {funcNamesWithCosts.map((func) => (
          <EndpointCost
            key={func.endpoint}
            funcName={func.endpoint}
            appInfo={appInfo}
            initialCost={func.cost}
          />
        ))}
      </div>
      <Divider />

      <h3 className="text-danger-500 text-center text-lg font-semibold">
        Danger Zone
      </h3>
      <div>
        {isShowConfirmUnpublish ? (
          <>
            <p className="text-danger-500 text-center font-semibold">
              Are you sure you want to unpublish this app? This action cannot be
              undone.
            </p>
            <div className="flex gap-x-1">
              <Button
                variant="light"
                className="w-full"
                onPress={() => setIsShowConfirmUnpublish(false)}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                className="w-full"
                onPress={async () => {
                  addToast({
                    title: "Deleting App",
                    description: `Deleting app ${appInfo.name}.`,
                  });
                  const response = await fetchAPI("/api/app/delete", {
                    method: "DELETE",
                    body: JSON.stringify({
                      name: appInfo.id,
                    }),
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  if (!response.ok) {
                    addToast({
                      title: "Error",
                      description: `Failed to unpublish app ${appInfo.name}.`,
                      color: "danger",
                    });
                    return;
                  }

                  addToast({
                    title: "App Unpublished",
                    description: `App ${appInfo.name} unpublished successfully.`,
                    color: "success",
                  });
                  setIsShowConfirmUnpublish(false);
                  editorContext?.updateModalStates({
                    appInfo: { isOpen: false },
                  });
                }}
              >
                Confirm Unpublish
              </Button>
            </div>
          </>
        ) : (
          <Button
            color="danger"
            className="w-full"
            onPress={async () => {
              setIsShowConfirmUnpublish(true);
            }}
          >
            Unpublish
          </Button>
        )}
      </div>
    </div>
  );
}

function EndpointCost({
  funcName,
  appInfo,
  initialCost,
}: {
  funcName: string;
  appInfo: AppInfoModalContent;
  initialCost?: number;
}) {
  const [costString, setCostString] = useState<string>(
    initialCost !== undefined ? initialCost.toString() : "",
  );

  const cost = useMemo(() => {
    const parsed = parseFloat(costString);
    if (isNaN(parsed) || parsed < 0) {
      return null;
    }
    return parsed;
  }, [costString]);

  async function handleClick() {
    addToast({
      title: "Setting Endpoint Cost",
      description: `Setting cost for endpoint ${funcName}: ${cost}.`,
    });
    const response = await fetchAPI("/api/app/settings/cost/set", {
      method: "POST",
      body: JSON.stringify({
        appId: appInfo.id,
        version: appInfo.version,
        endpoint: funcName,
        cost: cost,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      addToast({
        title: "Error",
        description: `Failed to set cost for endpoint ${funcName}. ${await response.text()}.`,
        color: "danger",
      });
      return;
    }

    addToast({
      title: "Cost Set",
      description: `Cost for endpoint ${funcName} set to ${cost} successfully.`,
      color: "success",
    });
  }

  return (
    <div className="flex flex-col gap-y-1">
      <p>
        <span className="font-semibold">Endpoint: </span> {funcName}
      </p>

      <div className="flex w-full gap-x-1">
        <Input
          type="number"
          placeholder="Credits Cost per Call"
          value={costString}
          onValueChange={setCostString}
          endContent={
            <div>
              <span className="text-default-foreground/60 whitespace-nowrap">
                credits per call
              </span>
            </div>
          }
        />
        <Button
          isIconOnly
          variant="light"
          isDisabled={cost === null}
          onPress={handleClick}
        >
          <Icon name="check" />
        </Button>
      </div>
    </div>
  );
}
