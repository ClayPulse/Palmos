import {
  Button,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
  Tooltip,
} from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import { sttProviderOptions } from "@/lib/stt/options";
import { ttsProviderOptions } from "@/lib/tts/options";
import toast from "react-hot-toast";
import ModalWrapper from "./modal-wrapper";
import { EditorContext } from "../providers/editor-context-provider";
import { EditorContextType, Extension } from "@/lib/types";
import Icon from "../misc/icon";
import useExplorer from "@/lib/hooks/use-explorer";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import useExtensions from "@/lib/hooks/use-extensions";
import { ExtensionTypeEnum } from "@pulse-editor/shared-utils";
import { llmProviderOptions } from "@/lib/llm/options";
import { getAPIKey, setAPIKey } from "@/lib/settings/settings";

function AISettings({ editorContext }: { editorContext?: EditorContextType }) {
  const { selectAndSetProjectHome } = useExplorer();

  return (
    <>
      <div>
        <p className="text-medium pb-2 font-bold">Editor Settings</p>
        <div className="w-full space-y-2">
          {editorContext?.persistSettings?.projectHomePath ? (
            <Input
              label="Project Home Path"
              size="md"
              isRequired
              value={editorContext?.persistSettings?.projectHomePath}
              onValueChange={(value) => {
                editorContext.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    projectHomePath: value,
                  };
                });
              }}
              endContent={
                <Button
                  onPress={() => {
                    selectAndSetProjectHome();
                  }}
                  isIconOnly
                  variant="light"
                >
                  <Icon name="folder" />
                </Button>
              }
              isDisabled={getPlatform() === PlatformEnum.Capacitor}
            />
          ) : (
            <div className="space-y-1">
              <p className="text-content4-foreground text-sm">
                All your projects will be saved in this folder.
              </p>
              <Button
                className="w-full"
                onPress={() => {
                  selectAndSetProjectHome();
                }}
              >
                Select Project Home Path
              </Button>
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="text-medium pb-2 font-bold">STT</p>
        <div className="w-full space-y-2">
          <Select
            items={sttProviderOptions}
            disabledKeys={sttProviderOptions
              .filter((provider) => !provider.isSupported)
              .map((provider) => provider.provider)}
            label="Provider"
            placeholder="Select a provider"
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  sttProvider: e.target.value,
                  sttModel: undefined,
                };
              });
            }}
            isRequired
            selectedKeys={
              editorContext?.persistSettings?.sttProvider
                ? [editorContext?.persistSettings.sttProvider]
                : []
            }
          >
            {(providerOption) => (
              <SelectItem key={providerOption.provider}>
                {providerOption.provider}
              </SelectItem>
            )}
          </Select>
          <Select
            isDisabled={!editorContext?.persistSettings?.sttProvider}
            items={
              sttProviderOptions.find(
                (provider) =>
                  provider.provider ===
                  editorContext?.persistSettings?.sttProvider,
              )?.models ?? []
            }
            disabledKeys={
              sttProviderOptions
                .find(
                  (provider) =>
                    provider.provider ===
                    editorContext?.persistSettings?.sttProvider,
                )
                ?.models.filter((model) => !model.isSupported)
                .map((model) => model.model) ?? []
            }
            label="Model"
            placeholder="Select a model"
            isRequired
            selectedKeys={
              editorContext?.persistSettings?.sttModel
                ? [editorContext?.persistSettings.sttModel]
                : []
            }
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  sttModel: e.target.value,
                };
              });
            }}
          >
            {(modelOption) => (
              <SelectItem key={modelOption.model}>
                {modelOption.model}
              </SelectItem>
            )}
          </Select>
          <Tooltip
            content={
              <p>
                Please disable password to edit API Key. <br />
                You can enable password again after editing API keys.
              </p>
            }
            isDisabled={!editorContext?.persistSettings?.isUsePassword}
          >
            <Input
              label="API Key"
              size="md"
              isRequired
              value={
                editorContext?.persistSettings?.isPasswordSet
                  ? "API key is encrypted"
                  : (getAPIKey(
                      editorContext,
                      editorContext?.persistSettings?.sttProvider,
                    ) ?? "")
              }
              onValueChange={(value) => {
                setAPIKey(
                  editorContext,
                  editorContext?.persistSettings?.sttProvider,
                  value,
                );
              }}
              isDisabled={!editorContext?.persistSettings?.sttProvider}
              isReadOnly={editorContext?.persistSettings?.isUsePassword}
            />
          </Tooltip>
        </div>
      </div>
      <Divider />
      <div>
        <p className="text-medium pb-2 font-bold">LLM</p>
        <div className="w-full space-y-2">
          <Select
            items={llmProviderOptions}
            disabledKeys={llmProviderOptions
              .filter((provider) => !provider.isSupported)
              .map((provider) => provider.provider)}
            label="Provider"
            placeholder="Select a provider"
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  llmProvider: e.target.value,
                  llmModel: undefined,
                };
              });
            }}
            isRequired
            selectedKeys={
              editorContext?.persistSettings?.llmProvider
                ? [editorContext?.persistSettings.llmProvider]
                : []
            }
          >
            {(providerOption) => (
              <SelectItem key={providerOption.provider}>
                {providerOption.provider}
              </SelectItem>
            )}
          </Select>
          <Select
            isDisabled={!editorContext?.persistSettings?.llmProvider}
            items={
              llmProviderOptions.find(
                (provider) =>
                  provider.provider ===
                  editorContext?.persistSettings?.llmProvider,
              )?.models ?? []
            }
            disabledKeys={
              llmProviderOptions
                .find(
                  (provider) =>
                    provider.provider ===
                    editorContext?.persistSettings?.llmProvider,
                )
                ?.models.filter((model) => !model.isSupported)
                .map((model) => model.model) ?? []
            }
            label="Model"
            placeholder="Select a model"
            isRequired
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  llmModel: e.target.value,
                };
              });
            }}
            selectedKeys={
              editorContext?.persistSettings?.llmModel
                ? [editorContext?.persistSettings?.llmModel]
                : []
            }
          >
            {(modelOption) => (
              <SelectItem key={modelOption.model}>
                {modelOption.model}
              </SelectItem>
            )}
          </Select>
          <Tooltip
            content={
              <p>
                Please disable password to edit API Key. <br />
                You can enable password again after editing API keys.
              </p>
            }
            isDisabled={!editorContext?.persistSettings?.isUsePassword}
          >
            <Input
              label="API Key"
              size="md"
              isRequired
              value={
                editorContext?.persistSettings?.isPasswordSet
                  ? "API key is encrypted"
                  : (getAPIKey(
                      editorContext,
                      editorContext?.persistSettings?.llmProvider,
                    ) ?? "")
              }
              onValueChange={(value) => {
                setAPIKey(
                  editorContext,
                  editorContext?.persistSettings?.llmProvider,
                  value,
                );
              }}
              isDisabled={!editorContext?.persistSettings?.llmProvider}
              isReadOnly={editorContext?.persistSettings?.isUsePassword}
            />
          </Tooltip>
        </div>
      </div>
      <Divider />
      <div>
        <p className="text-medium pb-2 font-bold">TTS</p>
        <div className="w-full space-y-2">
          <Select
            items={ttsProviderOptions}
            disabledKeys={ttsProviderOptions
              .filter((provider) => !provider.isSupported)
              .map((provider) => provider.provider)}
            label="Provider"
            placeholder="Select a provider"
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  ttsProvider: e.target.value,
                  ttsModel: undefined,
                };
              });
            }}
            isRequired
            selectedKeys={
              editorContext?.persistSettings?.ttsProvider
                ? [editorContext?.persistSettings?.ttsProvider]
                : []
            }
          >
            {(providerOption) => (
              <SelectItem key={providerOption.provider}>
                {providerOption.provider}
              </SelectItem>
            )}
          </Select>
          <Select
            isDisabled={!editorContext?.persistSettings?.ttsProvider}
            items={
              ttsProviderOptions.find(
                (provider) =>
                  provider.provider ===
                  editorContext?.persistSettings?.ttsProvider,
              )?.models ?? []
            }
            disabledKeys={
              ttsProviderOptions
                .find(
                  (provider) =>
                    provider.provider ===
                    editorContext?.persistSettings?.ttsProvider,
                )
                ?.models.filter((model) => !model.isSupported)
                .map((model) => model.model) ?? []
            }
            label="Model"
            placeholder="Select a model"
            isRequired
            onChange={(e) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  ttsModel: e.target.value,
                };
              });
            }}
            selectedKeys={
              editorContext?.persistSettings?.ttsModel
                ? [editorContext?.persistSettings?.ttsModel]
                : []
            }
          >
            {(modelOption) => (
              <SelectItem key={modelOption.model}>
                {modelOption.model}
              </SelectItem>
            )}
          </Select>
          <Input
            label="Voice Name"
            size="md"
            isRequired
            value={editorContext?.persistSettings?.ttsVoice ?? ""}
            onValueChange={(value) => {
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  ttsVoice: value,
                };
              });
            }}
            isDisabled={!editorContext?.persistSettings?.ttsProvider}
          />
          <Tooltip
            content={
              <p>
                Please disable password to edit API Key. <br />
                You can enable password again after editing API keys.
              </p>
            }
            isDisabled={!editorContext?.persistSettings?.isUsePassword}
          >
            <Input
              label="API Key"
              size="md"
              isRequired
              value={
                editorContext?.persistSettings?.isPasswordSet
                  ? "API key is encrypted"
                  : (getAPIKey(
                      editorContext,
                      editorContext?.persistSettings?.ttsProvider,
                    ) ?? "")
              }
              onValueChange={(value) => {
                setAPIKey(
                  editorContext,
                  editorContext?.persistSettings?.ttsProvider,
                  value,
                );
              }}
              isDisabled={!editorContext?.persistSettings?.ttsProvider}
              isReadOnly={editorContext?.persistSettings?.isUsePassword}
            />
          </Tooltip>
        </div>
      </div>
    </>
  );
}

function SecuritySettings({
  editorContext,
  setIsOpen,
}: {
  editorContext?: EditorContextType;
  setIsOpen: (open: boolean) => void;
}) {
  const [ttl, setTTL] = useState<string>("14");

  return (
    <div>
      <p className="text-medium pb-2 font-bold">Security</p>
      <p className="text-small">
        Use a password to encrypt the API tokens. You will need to re-enter all
        API tokens if you forget the password.
      </p>
      <Switch
        isSelected={editorContext?.persistSettings?.isUsePassword ?? false}
        onChange={(e) => {
          const newValue = e.target.checked;
          if (newValue) {
            setIsOpen(false);
            editorContext?.setPersistSettings((prev) => {
              return {
                ...prev,
                isUsePassword: newValue,
              };
            });
          } else {
            // Reset all settings
            editorContext?.setPersistSettings(undefined);
            // Remove password from memory
            editorContext?.setEditorStates((prev) => {
              return {
                ...prev,
                password: undefined,
              };
            });
          }
        }}
      >
        Encrypt API tokens with password
      </Switch>
      <p className="text-small">
        The API tokens are saved for the duration of the TTL (Time To Live)
        days. After the TTL, the API tokens will be deleted when the app opens
        next time. Set -1 to keep the tokens indefinitely.
      </p>
      <Input
        label="TTL (in days)"
        size="md"
        isRequired
        defaultValue="14"
        value={ttl}
        onValueChange={(value) => {
          setTTL(value);

          let days = 14;

          days = parseInt(value);

          // Reset to default if invalid
          if (days < -1) {
            days = 14;
          } else if (Number.isNaN(days)) {
            days = 14;
            toast.error("Invalid input. Using default 14 days.");
          }

          editorContext?.setPersistSettings((prev) => {
            return {
              ...prev,
              ttl: days === -1 ? -1 : days * 86400000,
            };
          });
        }}
      />
    </div>
  );
}

function DevExtensionSettings({
  editorContext,
}: {
  editorContext?: EditorContextType;
}) {
  const [fileTypeExtensionMap, setFileTypeExtensionMap] = useState<
    Map<string, Extension[]>
  >(new Map());

  const fileTypeEntries = Array.from(fileTypeExtensionMap.entries());

  const [devExtensionRemoteOrigin, setDevExtensionRemoteOrigin] =
    useState<string>("http://localhost:3001");
  const [devExtensionId, setDevExtensionId] = useState<string>("");
  const [devExtensionVersion, setDevExtensionVersion] = useState<string>("");

  const { installExtension } = useExtensions();

  // Load installed extensions
  useEffect(() => {
    const extensions = editorContext?.persistSettings?.extensions ?? [];
    extensions.forEach((extension) => {
      if (extension.config.extensionType === ExtensionTypeEnum.FileView) {
        const fileTypes = extension.config.fileTypes;
        console.log(fileTypes);

        if (fileTypes) {
          fileTypes.forEach((fileType) => {
            if (!fileTypeExtensionMap.has(fileType)) {
              fileTypeExtensionMap.set(fileType, []);
            }
            fileTypeExtensionMap.get(fileType)?.push(extension);
          });
        } else {
          const fileType = "*";
          if (!fileTypeExtensionMap.has(fileType)) {
            fileTypeExtensionMap.set(fileType, []);
          }

          fileTypeExtensionMap.get(fileType)?.push(extension);
        }

        setFileTypeExtensionMap(new Map(fileTypeExtensionMap));
      }
    });
  }, []);

  return (
    <div>
      <p className="text-medium pb-2 font-bold">Dev Extension Settings</p>
      <div className="w-full space-y-2">
        <div>
          <p className="text-small font-bold">
            File Type Default Extension Mapping
          </p>
          <div className="mt-1 mb-4 space-y-2">
            {fileTypeEntries.length === 0 ? (
              <p className="text-small">
                No file types found. Please install extensions that support file
                types.
              </p>
            ) : (
              fileTypeEntries.map(([fileType, extensions]) => {
                return (
                  <div key={fileType} className="grid grid-cols-2">
                    <p className="text-medium self-center">{"." + fileType}</p>
                    <Select
                      aria-label="Select default extension"
                      size="sm"
                      items={extensions}
                      placeholder="Select default extension"
                      onChange={(e) => {
                        const extension = extensions.find(
                          (ext) => ext.config.id === e.target.value,
                        );
                        if (!extension) {
                          return;
                        }

                        editorContext?.setPersistSettings((prev) => {
                          return {
                            ...prev,
                            defaultFileTypeExtensionMap: {
                              ...prev?.defaultFileTypeExtensionMap,
                              [fileType]: extension,
                            },
                          };
                        });
                      }}
                      selectedKeys={
                        editorContext?.persistSettings
                          ?.defaultFileTypeExtensionMap
                          ? [
                              editorContext?.persistSettings
                                ?.defaultFileTypeExtensionMap[fileType]?.config
                                .id,
                            ]
                          : []
                      }
                    >
                      {extensions.map((extension) => {
                        return (
                          <SelectItem key={extension.config.id}>
                            {extension.config.id}
                          </SelectItem>
                        );
                      })}
                    </Select>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <p className="text-small font-bold">Extension Dev Mode</p>
      <p className="text-small">
        Load extension from local extension dev server at http://localhost:3001.
      </p>
      <Switch
        isSelected={editorContext?.persistSettings?.isExtensionDevMode ?? false}
        onChange={(e) => {
          editorContext?.setPersistSettings((prev) => ({
            ...prev,
            isExtensionDevMode: e.target.checked,
          }));
          if (e.target.checked) {
            toast.success("Extension dev mode enabled");
          } else {
            toast.success("Extension dev mode disabled");
          }
        }}
      >
        Enable extension dev mode
      </Switch>
      {editorContext?.persistSettings?.isExtensionDevMode && (
        <div className="space-y-2">
          <Input
            label="Extension Dev Server URL"
            size="md"
            isRequired
            value={devExtensionRemoteOrigin}
            onValueChange={setDevExtensionRemoteOrigin}
          />
          <Input
            label="Extension ID"
            size="md"
            isRequired
            placeholder={"(extension_id)"}
            value={devExtensionId}
            onValueChange={setDevExtensionId}
          />
          <Input
            label="Extension Version"
            size="md"
            isRequired
            placeholder={"(version)"}
            value={devExtensionVersion}
            onValueChange={setDevExtensionVersion}
          />
          <Button
            onPress={() => {
              if (
                devExtensionRemoteOrigin &&
                devExtensionId &&
                devExtensionVersion
              ) {
                const ext: Extension = {
                  remoteOrigin: devExtensionRemoteOrigin,
                  config: {
                    id: devExtensionId,
                    version: devExtensionVersion,
                  },
                  isEnabled: true,
                };

                installExtension(ext).then(() => {
                  toast.success("Extension installed");
                });
              }
            }}
          >
            Add Dev Extension
          </Button>
        </div>
      )}
    </div>
  );
}

function ExtensionDefinedSettings({
  editorContext,
}: {
  editorContext: EditorContextType | undefined;
}) {
  return (
    <div>
      <p className="text-medium pb-2 font-bold">Extension Defined Settings</p>
      <p className="text-small font-bold">Pulse Editor Terminal</p>
      <div className="w-full space-y-2">
        <Input
          label="Device Host Address"
          size="md"
          isRequired
          value={editorContext?.persistSettings?.mobileHost ?? ""}
          onValueChange={(value) => {
            editorContext?.setPersistSettings((prev) => {
              return {
                ...prev,
                mobileHost: value,
              };
            });
          }}
        />
      </div>
    </div>
  );
}

export default function AppSettingsModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  return (
    <ModalWrapper isOpen={isOpen} setIsOpen={setIsOpen} title={"App Settings"}>
      <>
        <div className="flex w-full flex-col gap-2">
          <AISettings editorContext={editorContext} />
          <Divider />
          <SecuritySettings
            editorContext={editorContext}
            setIsOpen={setIsOpen}
          />
          <Divider />
          <DevExtensionSettings editorContext={editorContext} />
          <Divider />
          <ExtensionDefinedSettings editorContext={editorContext} />
        </div>
      </>
    </ModalWrapper>
  );
}
