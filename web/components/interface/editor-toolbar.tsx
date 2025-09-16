"use client";

import { Button, Divider, Tooltip } from "@heroui/react";
import { useContext, useEffect, useState } from "react";
import Icon from "@/components/misc/icon";
import AppSettingsModal from "@/components/modals/app-settings-modal";
import { AnimatePresence, motion } from "framer-motion";
import { EditorContext } from "../providers/editor-context-provider";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { AppViewConfig, CanvasViewConfig, PlatformEnum } from "@/lib/types";
import toast from "react-hot-toast";
import ExtensionMarketplaceModal from "../modals/extension-marketplace-modal";
import AgentConfigModal from "../modals/agent-config-modal";
import useSpeech2Speech from "@/lib/hooks/use-speech2speech";
import { getAPIKey } from "@/lib/settings/api-manager-utils";
import { editorAssistantAgent } from "@/lib/agent/built-in-agents/editor-assistant";
import { getAgentLLMConfig, runAgentMethod } from "@/lib/agent/agent-runner";
import useExtensionCommands from "@/lib/hooks/use-extension-commands";
import useTTS from "@/lib/hooks/use-tts";
import { usePlatformApi } from "@/lib/hooks/use-platform-api";
import { ExtensionTypeEnum, ViewModeEnum } from "@pulse-editor/shared-utils";
import { useTabViewManager } from "@/lib/hooks/use-tab-view-manager";
import { getDefaultLLMConfig } from "@/lib/modalities/utils";

export default function EditorToolbar() {
  const editorContext = useContext(EditorContext);
  const { platformApi } = usePlatformApi();

  const [isAgentListModalOpen, setIsAgentListModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isAppSettingsModalOpen, setAppIsSettingsModalOpen] = useState(false);

  const { runSpeech2Speech, stopSpeech2Speech, isUsing } = useSpeech2Speech();
  const { readText, playAudio } = useTTS();
  const { runCommand } = useExtensionCommands();

  const [userVoiceMessage, setUserVoiceMessage] = useState<string>("");

  const [assistantResult, setAssistantResult] = useState<any>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState("");
  const [analysisAudio, setAnalysisAudio] = useState<Blob | undefined>(
    undefined,
  );

  const { activeTabView } = useTabViewManager();

  // When speech2speech returns assistant result, we let the assistant agent to analyze its effects
  useEffect(() => {
    async function processAssistantResult() {
      if (!assistantResult) {
        return;
      }

      const {
        suggestedCmd,
        suggestedArgs,
        suggestedViewId,
        response,
      }: {
        suggestedCmd: string;
        suggestedArgs: {
          name: string;
          value: any;
        }[];
        suggestedViewId: string;
        response: string;
      } = assistantResult;

      // TODO: The agent needs to confirm the command with the user
      // TODO: before executing it.
      const args = suggestedArgs.reduce(
        (acc, arg) => {
          acc[arg.name] = arg.value;
          return acc;
        },
        {} as Record<string, any>,
      );

      // Show thinking indicator
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isThinking: true,
        thinkingText: "Executing command...",
      }));

      const cmdResult = await runCommand(suggestedViewId, suggestedCmd, args);

      if (process.env.NODE_ENV === "development") {
        console.log("Command result:", cmdResult);
      }

      if (!editorAssistantAgent.LLMConfig) {
        toast.error("Agent is not configured to analyze command result.");
        return;
      }

      const llmKey = getAPIKey(
        editorContext,
        editorContext?.persistSettings?.llmProvider,
      );

      if (!llmKey) {
        toast.error("Please set your LLM API key in settings.");
        return;
      }

      const { analysis }: { analysis: string } = await runAgentMethod(
        llmKey,
        editorAssistantAgent.LLMConfig,
        editorAssistantAgent,
        "analyzeCommandResult",
        {
          userMessage: userVoiceMessage,
          suggestedCmd: suggestedCmd,
          previousSuggestion: response,
          commandResult: cmdResult,
        },
      );

      if (process.env.NODE_ENV === "development") {
        console.log("Command analysis:", analysis);
      }
      setPendingAnalysis(analysis);
    }

    processAssistantResult();
  }, [assistantResult]);

  // When the assistant agent is done analyzing the command result, we can
  // play the analysis result to the user.
  useEffect(() => {
    if (pendingAnalysis.length > 0) {
      if (!isUsing) {
        // Show thinking indicator
        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isThinking: true,
          thinkingText: "Analyzing command result...",
        }));
      }
      readText(pendingAnalysis).then((blob) => {
        setPendingAnalysis("");
        setAnalysisAudio(blob);
      });
    }
  }, [pendingAnalysis, isUsing]);

  // Play the audio when the speech2speech is done and the analysis is done
  useEffect(() => {
    if (!isUsing && analysisAudio) {
      // Show thinking indicator
      editorContext?.setEditorStates((prev) => ({
        ...prev,
        isThinking: true,
        thinkingText: "Analyzing command result...",
      }));
      playAudio(analysisAudio).then(() => {
        setAnalysisAudio(undefined);
      });
    }
  }, [isUsing, analysisAudio]);

  function setIsOpen(val: boolean) {
    if (editorContext) {
      editorContext.setEditorStates((prev) => ({
        ...prev,
        isToolbarOpen: val,
      }));
    }
  }

  async function handleMicFinished() {
    if (!editorContext) {
      return;
    }

    if (getPlatform() === PlatformEnum.VSCode) {
      toast.error(
        "Voice Chat is not supported in VSCode Extension. Please use other versions for Voice Chat.",
      );
      return;
    }

    if (!editorContext.editorStates.isRecording) {
      const llmProvider = editorContext.persistSettings?.llmProvider;
      const llmModel = editorContext.persistSettings?.llmModel;

      if (!llmProvider || !llmModel) {
        toast.error("Please set your LLM provider and model in settings.");
        return;
      }
      const llmKey = getAPIKey(
        editorContext,
        editorContext.persistSettings?.llmProvider,
      );

      if (!llmKey) {
        toast.error("Please set your LLM API key in settings.");
        return;
      }

      const agent = editorAssistantAgent;
      const methodName = "useExtensionCommands";

      runSpeech2Speech(async (inputText: string) => {
        const currentPath =
          editorContext.persistSettings?.projectHomePath &&
          editorContext.editorStates.project
            ? editorContext.persistSettings?.projectHomePath +
              "/" +
              editorContext.editorStates.project
            : undefined;

        const projectDirTree = [];
        if (currentPath) {
          const gitIgnorePath = `${currentPath}/.gitignore`;
          const gitIgnoreLines: string[] = [];
          if (await platformApi?.hasPath(gitIgnorePath)) {
            const gitIgnoreFile = await platformApi?.readFile(gitIgnorePath);
            const gitIgnoreContent = await gitIgnoreFile?.text();
            const lines = gitIgnoreContent?.split("\n") ?? [];
            gitIgnoreLines.push(...lines.filter((line) => line.trim() !== ""));
          }
          const tree =
            (await platformApi?.listPathContent(currentPath, {
              include: "all",
              gitignore: gitIgnoreLines,
              isRecursive: true,
            })) ?? [];
          projectDirTree.push(...tree);
        }

        const config =
          getAgentLLMConfig(agent, methodName) ??
          getDefaultLLMConfig(editorContext);

        if (!config) {
          toast.error("No LLM config found for agent.");
          return "No LLM config found for agent. Please configure the LLM in settings.";
        }

        setUserVoiceMessage(inputText);
        // Pipe the LLM result to Speech2Speech
        // const stream = await llm.generateStream(inputText);
        const result = await runAgentMethod(llmKey, config, agent, methodName, {
          chatHistory: [],
          userMessage: inputText,
          activeTabView,
          commands: editorContext.persistSettings?.extensionCommands
            ?.filter((command) => {
              // TODO: Filter commands based on the opened views
              //       instead of installed extensions.
              //       For example, some extension might be opened
              //       in multiple StandaloneAppView. Commands should
              //       be separately available in all those views.
              if (activeTabView?.type === ViewModeEnum.App) {
                // Find the extension that has this command
                const installedApp =
                  editorContext.persistSettings?.extensions?.find(
                    (ext) => ext.config.id === command.moduleId,
                  );

                if (!installedApp) {
                  return false;
                }

                const appConfig = activeTabView?.config as AppViewConfig;
                // Filter by active view
                if (appConfig?.app === installedApp.config.id) {
                  return true;
                }
                // Else, filter by extension type -- no need to remove console view command
                // if the console panel is open
                else if (
                  editorContext.editorStates.isConsolePanelOpen &&
                  installedApp.config.extensionType ===
                    ExtensionTypeEnum.ConsoleView
                ) {
                  return true;
                }
              } else if (activeTabView?.type === ViewModeEnum.Canvas) {
                // In canvas view, we show all commands from apps opened in the canvas
                const appConfigs = (activeTabView?.config as CanvasViewConfig)
                  .appConfigs;

                const installedApps =
                  editorContext.persistSettings?.extensions?.filter(
                    (ext) =>
                      appConfigs?.find((app) => app.app === ext.config.id) !==
                      undefined,
                  );

                //
                if (
                  installedApps?.find(
                    (ext) => ext.config.id === command.moduleId,
                  )
                ) {
                  return true;
                }
              }

              return false;
            })
            .map((command) => ({
              cmd: command.name,
              parameters: Object.entries(command.parameters).map(
                ([key, value]) => ({
                  name: key,
                  type: value.type,
                  description: value.description,
                }),
              ),
              description: command.description,
              moduleId: command.moduleId,
            })),
          projectDirTree: projectDirTree,
        });

        const {
          suggestedCmd,
          suggestedArgs,
          suggestedViewId,
          response,
        }: {
          suggestedCmd: string;
          suggestedArgs: {
            name: string;
            value: any;
          }[];
          suggestedViewId: string;
          response: string;
        } = result;

        setAssistantResult(result);

        return response;
      });
    } else {
      stopSpeech2Speech();
    }
  }

  return (
    <div
      className={
        "fixed bottom-0 left-1/2 z-30 flex w-fit -translate-x-1/2 flex-col items-center justify-center space-y-0.5 pb-1"
      }
    >
      <AnimatePresence>
        {editorContext?.editorStates.isToolbarOpen && (
          <motion.div
            initial={{
              y: 60,
            }}
            animate={{
              y: 0,
            }}
            exit={{
              y: 80,
            }}
          >
            <div className="bg-content2 relative flex h-10 w-fit items-center rounded-full px-2 py-1 shadow-md">
              {/* <Tooltip content={"Pen Tool"}>
                <Button
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (editorContext?.editorStates) {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isDrawing: !editorContext?.editorStates.isDrawing,
                      }));
                    }
                  }}
                  variant={
                    editorContext?.editorStates?.isDrawing ? "solid" : "light"
                  }
                >
                  <Icon name="edit" variant="round" />
                </Button>
              </Tooltip>
              <Tooltip content={"Inline Chat Tool"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                >
                  <Icon name="comment" variant="outlined" />
                </Button>
              </Tooltip> */}

              {/* <Divider className="mx-1" orientation="vertical" /> */}
              <Tooltip content={"Open Agentic Console"}>
                <Button
                  variant={
                    editorContext?.editorStates?.isConsolePanelOpen
                      ? "solid"
                      : "light"
                  }
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    if (editorContext?.editorStates) {
                      editorContext?.setEditorStates((prev) => ({
                        ...prev,
                        isConsolePanelOpen:
                          !editorContext?.editorStates.isConsolePanelOpen,
                      }));
                    }
                  }}
                >
                  <Icon name="terminal" variant="outlined" />
                </Button>
              </Tooltip>

              <Tooltip content={"Voice Chat With Agent"}>
                <Button
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    handleMicFinished();
                  }}
                  variant={
                    editorContext?.editorStates?.isRecording ? "solid" : "light"
                  }
                >
                  <Icon name="mic" variant="outlined" />
                </Button>
              </Tooltip>

              <Divider className="mx-1" orientation="vertical" />

              <Tooltip content={"Agent Configuration"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    setIsAgentListModalOpen(true);
                  }}
                >
                  <Icon name="smart_toy" variant="outlined" />
                </Button>
              </Tooltip>
              <AgentConfigModal
                isOpen={isAgentListModalOpen}
                setIsOpen={setIsAgentListModalOpen}
              />

              <Tooltip content={"Discover Extensions"}>
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => {
                    setIsExtensionModalOpen(true);
                  }}
                >
                  <Icon name="dashboard_customize" variant="outlined" />
                </Button>
              </Tooltip>
              <ExtensionMarketplaceModal
                isOpen={isExtensionModalOpen}
                setIsOpen={setIsExtensionModalOpen}
              />

              {/* <SettingPopover /> */}
              <Tooltip content="Settings">
                <Button
                  variant="light"
                  isIconOnly
                  className="text-default-foreground h-8 w-8 min-w-8 px-1 py-1"
                  onPress={() => setAppIsSettingsModalOpen(true)}
                >
                  <Icon name="settings" variant="outlined" />
                </Button>
              </Tooltip>
              <AppSettingsModal
                isOpen={isAppSettingsModalOpen}
                setIsOpen={setAppIsSettingsModalOpen}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editorContext?.editorStates.isToolbarOpen ? (
        <Button
          isIconOnly
          className="bg-content2 h-4 w-10"
          onPress={() => {
            setIsOpen(false);
          }}
        >
          <Icon
            name="keyboard_arrow_down"
            className="text-content2-foreground"
          />
        </Button>
      ) : (
        <Button
          isIconOnly
          className="bg-content2 h-4 w-10"
          onPress={() => {
            setIsOpen(true);
          }}
        >
          <Icon name="keyboard_arrow_up" className="text-content2-foreground" />
        </Button>
      )}
    </div>
  );
}
