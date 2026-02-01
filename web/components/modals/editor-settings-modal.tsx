import { PlatformEnum } from "@/lib/enums";
import { useAuth } from "@/lib/hooks/use-auth";
import useExplorer from "@/lib/hooks/use-explorer";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import useRouter from "@/lib/hooks/use-router";
import { imageGenProviderOptions } from "@/lib/modalities/image-gen/registry";
import { llmProviderOptions } from "@/lib/modalities/llm/registry";
import { sttProviderOptions } from "@/lib/modalities/stt/registry";
import { ttsProviderOptions } from "@/lib/modalities/tts/registry";
import { videoGenProviderOptions } from "@/lib/modalities/video-gen/registry";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAPIKey, setAPIKey } from "@/lib/settings/api-manager-utils";
import { EditorContextType, ExtensionApp } from "@/lib/types";
import {
  addToast,
  Alert,
  Button,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
  Tooltip,
} from "@heroui/react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Icon from "../misc/icon";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function EditorSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {getTranslations: t} = useTranslations();
  const editorContext = useContext(EditorContext);

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title={t("settings.editorSettings")}>
      <div className="flex w-full flex-col gap-2">
        <GeneralSettings editorContext={editorContext} />
        <Divider />
        <AISettings editorContext={editorContext} />
        <Divider />
        <SecuritySettings editorContext={editorContext} setIsOpen={onClose} />
        <Divider />
        <DevExtensionSettings editorContext={editorContext} />
        <Divider />
        <ExtensionDefinedSettings editorContext={editorContext} />
      </div>
    </ModalWrapper>
  );
}

function GeneralSettings({
  editorContext,
}: {
  editorContext?: EditorContextType;
}) {
  const {getTranslations: t} = useTranslations();
  const { selectAndSetProjectHome } = useExplorer();
  const [newEnvKey, setNewEnvKey] = useState<string>("");
  const [newEnvValue, setNewEnvValue] = useState<string>("");

  const router = useRouter();

  return (
    <div>
      <p className="text-medium pb-2 font-bold">{t("settings.generalSettings")}</p>
      <div className="w-full space-y-2">
        {editorContext?.persistSettings?.projectHomePath ? (
          <Input
            label={t("settings.projectHomePath")}
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
              {t("settings.projectHomeDescription")}
            </p>
            <Button
              className="w-full"
              onPress={() => {
                selectAndSetProjectHome();
              }}
            >
              {t("settings.selectProjectHomePath")}
            </Button>
          </div>
        )}

        {/* Environment Variables */}
        <p className="text-content4-foreground text-sm">
          {t("settings.environmentVariables")}
        </p>
        <p className="text-warning text-sm">
          {t("settings.backendEnvVariablesWarning")}
        </p>
        {Object.entries(editorContext?.persistSettings?.envs ?? {}).length >
          0 && (
          <div className="space-y-1">
            {Object.entries(editorContext?.persistSettings?.envs ?? {}).map(
              ([key, value]) => (
                <div className="flex items-center gap-2" key={key}>
                  <div className="w-1/3 font-mono text-sm break-all">{key}</div>
                  <div className="w-2/3 font-mono text-sm break-all">
                    {value}
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    onPress={() => {
                      editorContext?.setPersistSettings((prev) => {
                        const newEnvs = { ...prev?.envs };
                        delete newEnvs[key];
                        return {
                          ...prev,
                          envs: newEnvs,
                        };
                      });
                    }}
                  >
                    <Icon name="delete" className="text-danger!" />
                  </Button>
                </div>
              ),
            )}
          </div>
        )}

        <div className="flex items-center gap-x-1">
          <Input
            label={t("settings.addNewVariable")}
            size="sm"
            value={newEnvKey}
            onValueChange={setNewEnvKey}
          />
          <Input
            label={t("settings.value")}
            size="sm"
            value={newEnvValue}
            onValueChange={setNewEnvValue}
          />
          <Button
            isIconOnly
            variant="light"
            onPress={() => {
              if (newEnvKey.trim() === "") {
                addToast({
                  title: t("appInfoModal.error"),
                  description: t("appInfoModal.envKeyEmpty"),
                  color: "danger",
                });
                return;
              }
              editorContext?.setPersistSettings((prev) => {
                return {
                  ...prev,
                  envs: {
                    ...prev?.envs,
                    [newEnvKey]: newEnvValue,
                  },
                };
              });
            }}
          >
            <Icon name="add" />
          </Button>
        </div>
        <div className="flex w-full flex-col">
          <Button
            onPress={() => {
              // Refresh page
              router.refresh();
            }}
          >
            {t("settings.restartToApply")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AISettings({ editorContext }: { editorContext?: EditorContextType }) {
  const { subscription, usage } = useAuth();
  const {getTranslations: t} = useTranslations();

  return (
    <>
      <div>
        <p className="text-medium pb-2 font-bold">{t("settings.aiSettings")}</p>
        <Switch
          isSelected={editorContext?.persistSettings?.isUseManagedCloud ?? true}
          onChange={(e) => {
            const newValue = e.target.checked;
            editorContext?.setPersistSettings((prev) => {
              return {
                ...prev,
                isUseManagedCloud: newValue,
              };
            });
          }}
        >
          {t("settings.useManagedAIEndpoints")}
        </Switch>
        <Alert
          color={
            (editorContext?.persistSettings?.isUseManagedCloud ?? true)
              ? "primary"
              : "secondary"
          }
        >
          {(editorContext?.persistSettings?.isUseManagedCloud ?? true)
            ? t("settings.managedCloudDescription")
            : t("settings.byoAPIKeysDescription")}
        </Alert>
      </div>

      {(editorContext?.persistSettings?.isUseManagedCloud ?? true) ? (
        <div className="flex flex-col items-center">
          <p className="text-medium pb-2 font-bold">
            {t("settings.yourPlan", { plan: subscription?.name ?? "" })}
          </p>
          <Button color="primary">{t("settings.upgradeManagePlan")}</Button>
          <p className="text-medium pb-2 font-bold">
            {t("settings.credits", { credits: usage?.remainingCredit ?? 0 })}
          </p>
          <Button color="primary">{t("settings.topUpCredits")}</Button>
        </div>
      ) : (
        <div>
          <p className="text-medium pb-2 font-bold">STT</p>
          <div className="w-full space-y-2">
            <Select
              items={Object.keys(sttProviderOptions).map((key) => ({
                provider: key,
              }))}
              label={t("settings.provider")}
              placeholder={t("settings.selectProvider")}
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
                sttProviderOptions[
                  editorContext?.persistSettings?.sttProvider ?? ""
                ]?.models.map((model) => ({ model: model.name })) ?? []
              }
              label={t("settings.model")}
              placeholder={t("settings.selectModel")}
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
                  {t("settings.passwordToEditApiKey")}
                </p>
              }
              isDisabled={!editorContext?.persistSettings?.isUsePassword}
            >
              <Input
                label={t("settings.apiKey")}
                size="md"
                isRequired
                value={
                  editorContext?.persistSettings?.isPasswordSet
                    ? t("settings.apiKeyEncrypted")
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

          <div>
            <p className="text-medium pb-2 font-bold">LLM</p>
            <div className="w-full space-y-2">
              <Select
                items={Object.keys(llmProviderOptions).map((key) => ({
                  provider: key,
                }))}
                label={t("settings.provider")}
                placeholder={t("settings.selectProvider")}
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
                  llmProviderOptions[
                    editorContext?.persistSettings?.llmProvider ?? ""
                  ]?.models.map((model) => ({ model: model.name })) ?? []
                }
                label={t("settings.model")}
                placeholder={t("settings.selectModel")}
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
                    {t("settings.passwordToEditApiKey")}
                  </p>
                }
                isDisabled={!editorContext?.persistSettings?.isUsePassword}
              >
                <Input
                  label={t("settings.apiKey")}
                  size="md"
                  isRequired
                  value={
                    editorContext?.persistSettings?.isPasswordSet
                      ? t("settings.apiKeyEncrypted")
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

          <div>
            <p className="text-medium pb-2 font-bold">TTS</p>
            <div className="w-full space-y-2">
              <Select
                items={Object.keys(ttsProviderOptions).map((key) => ({
                  provider: key,
                }))}
                label={t("settings.provider")}
                placeholder={t("settings.selectProvider")}
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
                  ttsProviderOptions[
                    editorContext?.persistSettings?.ttsProvider ?? ""
                  ]?.models.map((model) => ({ model: model.name })) ?? []
                }
                label={t("settings.model")}
                placeholder={t("settings.selectModel")}
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
                label={t("settings.voiceName")}
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
                    {t("settings.passwordToEditApiKey")}
                  </p>
                }
                isDisabled={!editorContext?.persistSettings?.isUsePassword}
              >
                <Input
                  label={t("settings.apiKey")}
                  size="md"
                  isRequired
                  value={
                    editorContext?.persistSettings?.isPasswordSet
                      ? t("settings.apiKeyEncrypted")
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

          <div>
            <p className="text-medium pb-2 font-bold">Image Gen</p>
            <Select
              items={Object.keys(imageGenProviderOptions).map((key) => ({
                provider: key,
              }))}
              label={t("settings.provider")}
              placeholder={t("settings.selectProvider")}
              onChange={(e) => {
                editorContext?.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    imageGenProvider: e.target.value,
                    imageGenModel: undefined,
                  };
                });
              }}
              isRequired
              selectedKeys={
                editorContext?.persistSettings?.imageGenProvider
                  ? [editorContext?.persistSettings?.imageGenProvider]
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
              isDisabled={!editorContext?.persistSettings?.imageGenProvider}
              items={
                imageGenProviderOptions[
                  editorContext?.persistSettings?.imageGenProvider ?? ""
                ]?.models.map((model) => ({ model: model.name })) ?? []
              }
              label={t("settings.model")}
              placeholder={t("settings.selectModel")}
              isRequired
              onChange={(e) => {
                editorContext?.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    imageGenModel: e.target.value,
                  };
                });
              }}
              selectedKeys={
                editorContext?.persistSettings?.imageGenModel
                  ? [editorContext?.persistSettings?.imageGenModel]
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
                  {t("settings.passwordToEditApiKey")}
                </p>
              }
              isDisabled={!editorContext?.persistSettings?.isUsePassword}
            >
              <Input
                label={t("settings.apiKey")}
                size="md"
                isRequired
                value={
                  editorContext?.persistSettings?.isPasswordSet
                    ? t("settings.apiKeyEncrypted")
                    : (getAPIKey(
                        editorContext,
                        editorContext?.persistSettings?.imageGenProvider,
                      ) ?? "")
                }
                onValueChange={(value) => {
                  setAPIKey(
                    editorContext,
                    editorContext?.persistSettings?.imageGenProvider,
                    value,
                  );
                }}
                isDisabled={!editorContext?.persistSettings?.imageGenProvider}
                isReadOnly={editorContext?.persistSettings?.isUsePassword}
              />
            </Tooltip>
          </div>

          <div>
            <p className="text-medium pb-2 font-bold">Video Gen</p>
            <Select
              items={Object.keys(videoGenProviderOptions).map((key) => ({
                provider: key,
              }))}
              label={t("settings.provider")}
              placeholder={t("settings.selectProvider")}
              onChange={(e) => {
                editorContext?.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    videoGenProvider: e.target.value,
                    videoGenModel: undefined,
                  };
                });
              }}
              isRequired
              selectedKeys={
                editorContext?.persistSettings?.videoGenProvider
                  ? [editorContext?.persistSettings?.videoGenProvider]
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
              isDisabled={!editorContext?.persistSettings?.videoGenProvider}
              items={
                videoGenProviderOptions[
                  editorContext?.persistSettings?.videoGenProvider ?? ""
                ]?.models.map((model) => ({ model: model.name })) ?? []
              }
              label={t("settings.model")}
              placeholder={t("settings.selectModel")}
              isRequired
              onChange={(e) => {
                editorContext?.setPersistSettings((prev) => {
                  return {
                    ...prev,
                    videoGenModel: e.target.value,
                  };
                });
              }}
              selectedKeys={
                editorContext?.persistSettings?.videoGenModel
                  ? [editorContext?.persistSettings?.videoGenModel]
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
                  {t("settings.passwordToEditApiKey")}
                </p>
              }
              isDisabled={!editorContext?.persistSettings?.isUsePassword}
            >
              <Input
                label={t("settings.apiKey")}
                size="md"
                isRequired
                value={
                  editorContext?.persistSettings?.isPasswordSet
                    ? t("settings.apiKeyEncrypted")
                    : (getAPIKey(
                        editorContext,
                        editorContext?.persistSettings?.videoGenProvider,
                      ) ?? "")
                }
                onValueChange={(value) => {
                  setAPIKey(
                    editorContext,
                    editorContext?.persistSettings?.videoGenProvider,
                    value,
                  );
                }}
                isDisabled={!editorContext?.persistSettings?.videoGenProvider}
                isReadOnly={editorContext?.persistSettings?.isUsePassword}
              />
            </Tooltip>
          </div>
        </div>
      )}
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
  const {getTranslations: t} = useTranslations();

  return (
    <div>
      <p className="text-medium pb-2 font-bold">{t("settings.security")}</p>
      <p className="text-small">
        {t("settings.passwordDescription")}
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
        {t("settings.encryptApiTokens")}
      </Switch>
      <p className="text-small">
        {t("settings.ttlDescription")}
      </p>
      <Input
        label={t("settings.ttlLabel")}
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
            addToast({
              title: t("appInfoModal.error"),
              description: t("settings.ttlError"),
              color: "danger",
            });
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
  const router = useRouter();
  const {getTranslations: t} = useTranslations();

  const [fileTypeExtensionMap, setFileTypeExtensionMap] = useState<
    Map<string, ExtensionApp[]>
  >(new Map());

  const fileTypeEntries = Array.from(fileTypeExtensionMap.entries());

  const [devExtensionRemoteOrigin, setDevExtensionRemoteOrigin] =
    useState<string>("http://localhost:3030");
  const [devExtensionId, setDevExtensionId] = useState<string>("");
  const [devExtensionVersion, setDevExtensionVersion] = useState<string>("");

  const { installExtensionApp } = useExtensionAppManager();

  // Load installed extensions
  useEffect(() => {
    const extensions = editorContext?.persistSettings?.extensions ?? [];
    extensions.forEach((extension) => {
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

      <p className="text-small font-bold">{t("settings.extensionDevMode")}</p>
      <p className="text-small">
        {t("settings.extensionDevModeDescription")}
      </p>
      <Switch
        isSelected={editorContext?.persistSettings?.isExtensionDevMode ?? false}
        onChange={(e) => {
          editorContext?.setPersistSettings((prev) => ({
            ...prev,
            isExtensionDevMode: e.target.checked,
          }));
          if (e.target.checked) {
            addToast({
              title: t("editorSettingsModal.devExtension.toast.devModeEnabled.title"),
              description: t("editorSettingsModal.devExtension.toast.devModeEnabled.description"),
              color: "success",
            });
          } else {
            addToast({
              title: t("editorSettingsModal.devExtension.toast.devModeDisabled.title"),
              description: t("editorSettingsModal.devExtension.toast.devModeDisabled.description"),
              color: "success",
            });
          }
        }}
      >
        {t("editorSettingsModal.devExtension.toast.enableDevMode")}
      </Switch>
      {editorContext?.persistSettings?.isExtensionDevMode && (
        <div className="space-y-2">
          <Input
            label={t("editorSettingsModal.devExtension.toast.extensionDevServerURL")}
            size="md"
            isRequired
            value={devExtensionRemoteOrigin}
            onValueChange={setDevExtensionRemoteOrigin}
          />
          <Input
            label={t("editorSettingsModal.devExtension.toast.extensionID")}
            size="md"
            isRequired
            placeholder={"(extension_id)"}
            value={devExtensionId}
            onValueChange={setDevExtensionId}
          />
          <Input
            label={t("editorSettingsModal.devExtension.toast.extensionVersion")}
            size="md"
            isRequired
            placeholder={"(version)"}
            value={devExtensionVersion}
            onValueChange={setDevExtensionVersion}
          />
          <div className="flex gap-x-1">
            <Button
              onPress={async () => {
                if (
                  devExtensionRemoteOrigin &&
                  devExtensionId &&
                  devExtensionVersion
                ) {
                  try {
                    await installExtensionApp(
                      devExtensionRemoteOrigin,
                      devExtensionId,
                      devExtensionVersion,
                    );
                    addToast({
                      title: t("editorSettingsModal.devExtension.toast.extensionInstalled.title"),
                      description: t("editorSettingsModal.devExtension.toast.extensionInstalled.description", { id: devExtensionId }),
                      color: "success",
                    });
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }
              }}
            >
              {t("editorSettingsModal.devExtension.toast.addDevExtension")}
            </Button>
            <Button
              onPress={() => {
                if (
                  devExtensionRemoteOrigin &&
                  devExtensionId &&
                  devExtensionVersion
                ) {
                  const url = `/?app=${encodeURIComponent(
                    `${devExtensionRemoteOrigin}/${devExtensionId}/${devExtensionVersion}`,
                  )}`;

                  router.replace(url);
                }
              }}
            >
              {t("editorSettingsModal.devExtension.toast.openAsApp")}
            </Button>
          </div>
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
  const {getTranslations: t} = useTranslations();
  
  return (
    <div>
      <p className="text-medium pb-2 font-bold">{t("settings.extensionDefinedSettings")}</p>
      <p className="text-small font-bold">{t("settings.pulseEditorTerminal")}</p>
      <div className="w-full space-y-2">
        <Input
          label={t("editorSettingsModal.devExtension.toast.deviceHostAddress")}
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
