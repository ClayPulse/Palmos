import { EditorContext } from "@/components/providers/editor-context-provider";
import {
  getAgentLLMConfig,
  runAgentMethodCloud,
  runAgentMethodLocal,
} from "@/lib/agent/agent-runner";
import { editorAssistantAgent } from "@/lib/agent/built-in-agents/editor-assistant";
import { PlatformEnum } from "@/lib/enums";
import { getDefaultLLMConfig } from "@/lib/modalities/utils";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { getAPIKey } from "@/lib/settings/api-manager-utils";
import {
  AppViewConfig,
  CanvasViewConfig,
  PlatformAssistantHistory,
  TabView,
  UserMessage,
} from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePlatformApi } from "./use-platform-api";
import useScopedActions from "./use-scoped-actions";
import useSpeech2Speech from "./use-speech2speech";
import { useTabViewManager } from "./use-tab-view-manager";
import useTTS from "./use-tts";

export default function usePlatformAIAssistant() {
  const editorContext = useContext(EditorContext);

  const isUseManagedCloud =
    editorContext?.persistSettings?.isUseManagedCloud ?? true;

  const [history, setHistory] = useState<PlatformAssistantHistory[]>([]);

  const { platformApi } = usePlatformApi();

  const { runSpeech2Speech, stopSpeech2Speech, isRunning } = useSpeech2Speech();
  const { readText, playAudio } = useTTS();
  const { runScopedAction, actions } = useScopedActions();
  const { activeTabView } = useTabViewManager();

  const [pendingAnalysis, setPendingAnalysis] = useState("");
  const [analysisAudio, setAnalysisAudio] = useState<Blob | undefined>(
    undefined,
  );
  const [userVoiceMessage, setUserVoiceMessage] = useState<string>("");
  const [assistantResult, setAssistantResult] = useState<any>(null);

  // When the assistant agent is done analyzing the command result, we can
  // play the analysis result to the user.
  useEffect(() => {
    if (pendingAnalysis.length > 0) {
      if (!isRunning) {
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
  }, [pendingAnalysis, isRunning]);

  // Play the audio when the speech2speech is done and the analysis is done
  useEffect(() => {
    if (!isRunning && analysisAudio) {
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
  }, [isRunning, analysisAudio]);

  // When speech2speech returns assistant result, we let the assistant agent to analyze its effects
  useEffect(() => {
    async function processAssistantResult() {
      if (!assistantResult) {
        return;
      }

      const {
        suggestedCmd,
        suggestedArgs,
        response,
      }: {
        suggestedCmd: string;
        suggestedArgs: {
          name: string;
          value: any;
        }[];
        response: string;
      } = assistantResult;

      console.log("Assistant result:", assistantResult);

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

      const action = actions.find((cmd) => cmd.action.name === suggestedCmd);
      if (!action) {
        toast.error(`Agent suggested command ${suggestedCmd} not found.`);
        return;
      }

      const actionResult = await runScopedAction(action, args);

      if (process.env.NODE_ENV === "development") {
        console.log("Command result:", actionResult);
      }

      const previousMessage = history[history.length - 1].message.content.text;

      if (isUseManagedCloud ?? true) {
        const { analysis }: { analysis: string } = await runAgentMethodCloud(
          editorAssistantAgent,
          "analyzeCommandResult",
          {
            userMessage: userVoiceMessage,
            suggestedCmd: suggestedCmd,
            previousSuggestion: response,
            commandResult: actionResult,
          },
          (chunk) => {
            if (!chunk.content.text) {
              return;
            }
            const textJson = JSON.parse(chunk.content.text);

            if (!textJson.analysis) {
              return;
            }
            // Update this in the history
            setHistory((prev) => {
              const newHistory = [...prev];
              if (newHistory.length > 0) {
                newHistory[newHistory.length - 1].message.content.text =
                  previousMessage + "\n\n### Result:\n" + textJson.analysis;
              }
              return newHistory;
            });
          },
        );
        if (process.env.NODE_ENV === "development") {
          console.log("Command analysis:", analysis);
        }

        editorContext?.setEditorStates((prev) => ({
          ...prev,
          isThinking: false,
        }));
      } else {
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

        const { analysis }: { analysis: string } = await runAgentMethodLocal(
          llmKey,
          editorAssistantAgent.LLMConfig,
          editorAssistantAgent,
          "analyzeCommandResult",
          {
            userMessage: userVoiceMessage,
            suggestedCmd: suggestedCmd,
            previousSuggestion: response,
            commandResult: actionResult,
          },
        );

        if (process.env.NODE_ENV === "development") {
          console.log("Command analysis:", analysis);
        }
        setPendingAnalysis(analysis);
      }
    }

    processAssistantResult();
  }, [assistantResult]);

  async function gatherActionArgs(userInput?: UserMessage) {
    function gatherActions() {
      return actions.map((cmd) => ({
        cmdName: cmd.action.name,
        parameters: Object.entries(cmd.action.parameters).map(
          ([key, value]) => ({
            name: key,
            type: value.type,
            description: value.description,
          }),
        ),
      }));
    }

    async function gatherProjectDirTree() {
      const currentPath =
        editorContext?.persistSettings?.projectHomePath &&
        editorContext?.editorStates.project
          ? editorContext?.persistSettings?.projectHomePath +
            "/" +
            editorContext?.editorStates.project
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

      return projectDirTree;
    }

    const tabView: TabView | undefined =
      activeTabView?.type === ViewModeEnum.App
        ? {
            ...activeTabView,
            // Remove dynamic commands to avoid sending too large payload.
            // This is already included in the commands argument.
            config: {
              ...(activeTabView?.config as any),
              dynamicCommands: undefined,
            } as AppViewConfig,
          }
        : activeTabView?.type === ViewModeEnum.Canvas
          ? {
              ...activeTabView,
              config: {
                ...(activeTabView?.config as CanvasViewConfig),
                appConfigs:
                  (activeTabView?.config as CanvasViewConfig)?.appConfigs?.map(
                    (appConfig) => ({
                      ...appConfig,
                      // Remove dynamic commands to avoid sending too large payload.
                      // This is already included in the commands argument.
                      dynamicCommands: undefined,
                    }),
                  ) ?? [],
              } as CanvasViewConfig,
            }
          : undefined;

    return {
      chatHistory: [],
      userMessage: userInput,
      activeTabView: tabView,
      availableCommands: gatherActions(),
      projectDirTree: await gatherProjectDirTree(),
    };
  }

  async function runCloudAssistant(input: UserMessage, isOutputAudio: boolean) {
    if (!editorContext) {
      return;
    }

    if (input.content.audio && getPlatform() === PlatformEnum.VSCode) {
      if (getPlatform() === PlatformEnum.VSCode) {
        toast.error(
          "Voice Chat is not supported in VSCode Extension. Please use other versions for Voice Chat.",
        );
        return;
      }
    }

    setHistory((prev) => [
      ...prev,
      {
        role: "user",
        message: input,
      },
    ]);

    const args = await gatherActionArgs(input);

    const result = await runAgentMethodCloud(
      editorAssistantAgent,
      "useExtensionCommands",
      args,
      (chunk) => {
        // Update history as new chunks arrive
        setHistory((prev) => {
          const newHistory = [...prev];
          if (
            newHistory.length > 0 &&
            newHistory[newHistory.length - 1].role === "assistant"
          ) {
            newHistory[newHistory.length - 1].message = chunk;
          } else {
            newHistory.push({
              role: "assistant",
              message: chunk,
            });
          }

          return newHistory;
        });
      },
    );

    // TODO: use latest history instead of raw agent result
    setAssistantResult(result);

    return result;
  }

  async function runLocalAssistant(input: UserMessage, isOutputAudio: boolean) {
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

      // Pipe the LLM result to Speech2Speech
      runSpeech2Speech(async (inputText: string) => {
        const config =
          getAgentLLMConfig(agent, methodName) ??
          getDefaultLLMConfig(editorContext);

        if (!config) {
          toast.error("No LLM config found for agent.");
          return "No LLM config found for agent. Please configure the LLM in settings.";
        }

        setUserVoiceMessage(inputText);

        const args = await gatherActionArgs({
          content: {
            text: inputText,
          },
        });

        const result = await runAgentMethodLocal(
          llmKey,
          config,
          agent,
          methodName,
          args,
        );

        const {
          response,
        }: {
          response: string;
        } = result;

        console.log("Agent suggestion:", result);

        setAssistantResult(result);

        return response;
      });
    } else {
      stopSpeech2Speech();
    }
  }

  /**
   * Run the assistant with the given input and output settings.
   * @param input User input, can be audio (ReadableStream) or text (string).
   * @param isOutputAudio Whether the output should be audio.
   */
  async function chatWithAssistant(input: UserMessage, isOutputAudio: boolean) {
    if (isUseManagedCloud ?? true) {
      runCloudAssistant(input, isOutputAudio);
    } else {
      runLocalAssistant(input, isOutputAudio);
    }
  }

  function getAgentSuggestedCommands(query: string, k: number) {
    return undefined;
  }

  return {
    isUseManagedCloud,
    history,
    chatWithAssistant,
  };
}
