import { EditorContext } from "@/components/providers/editor-context-provider";
import { editorAssistantAgent } from "@/lib/agent/built-in-agents/editor-assistant";
import { runLLMAgentMethod } from "@/lib/agent/llm-agent-runner";
import { PlatformEnum } from "@/lib/enums";
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
import { chatModels } from "../platform-assistant/chat-models";
import useActionExecutor from "./use-action-executor";
import { usePlatformApi } from "./use-platform-api";
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
  const { runScopedAction, actions } = useActionExecutor();
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
        const { analysis }: { analysis: string } = await runLLMAgentMethod(
          editorAssistantAgent,
          "analyzeCommandResult",
          {
            userMessage: userVoiceMessage,
            suggestedCmd: suggestedCmd,
            previousSuggestion: response,
            commandResult: actionResult,
          },
          (allReceivedChunk, newReceivedChunk) => {
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

  async function gatherAssistantArgs(userTextMessage?: string) {
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
      userMessage: userTextMessage,
      activeTabView: tabView,
      availableCommands: gatherActions(),
      projectDirTree: await gatherProjectDirTree(),
    };
  }

  // async function runLocalAssistant(input: UserMessage, isOutputAudio: boolean) {
  //   if (!editorContext) {
  //     return;
  //   }

  //   if (getPlatform() === PlatformEnum.VSCode) {
  //     toast.error(
  //       "Voice Chat is not supported in VSCode Extension. Please use other versions for Voice Chat.",
  //     );
  //     return;
  //   }

  //   if (!editorContext.editorStates.isRecording) {
  //     const llmProvider = editorContext.persistSettings?.llmProvider;
  //     const llmModel = editorContext.persistSettings?.llmModel;

  //     if (!llmProvider || !llmModel) {
  //       toast.error("Please set your LLM provider and model in settings.");
  //       return;
  //     }
  //     const llmKey = getAPIKey(
  //       editorContext,
  //       editorContext.persistSettings?.llmProvider,
  //     );

  //     if (!llmKey) {
  //       toast.error("Please set your LLM API key in settings.");
  //       return;
  //     }

  //     const agent = editorAssistantAgent;
  //     const methodName = "useAppActions";

  //     // Pipe the LLM result to Speech2Speech
  //     runSpeech2Speech(async (inputText: string) => {
  //       const config =
  //         getAgentLLMConfig(agent, methodName) ??
  //         getDefaultLLMConfig(editorContext);

  //       if (!config) {
  //         toast.error("No LLM config found for agent.");
  //         return "No LLM config found for agent. Please configure the LLM in settings.";
  //       }

  //       setUserVoiceMessage(inputText);

  //       const args = await gatherAssistantArgs(inputText);

  //       const result = await runAgentMethodLocal(
  //         llmKey,
  //         config,
  //         agent,
  //         methodName,
  //         args,
  //       );

  //       const {
  //         response,
  //       }: {
  //         response: string;
  //       } = result;

  //       console.log("Agent suggestion:", result);

  //       setAssistantResult(result);

  //       return response;
  //     });
  //   } else {
  //     stopSpeech2Speech();
  //   }
  // }

  /**
   * Run the assistant with the given input and output settings.
   * @param input User input, can be one of either audio (ReadableStream) or text (string).
   * @param isOutputAudio Whether the output should be audio.
   */
  async function chatWithAssistant(input: UserMessage, isOutputAudio: boolean) {
    if (!editorContext) {
      return;
    }

    // Check for currently used chat model.
    // If it is LLM only,
    //  - if has audio input, pipe to STT first, then send text to LLM
    //  - if text only but audio output is disabled, send text to LLM, then return text
    //  - if text only but audio output is enabled, send text to LLM, then pipe text to TTS
    // If it is speech2speech model,
    //  - if has audio, pipe to speech2speech directly
    //  - if text only, send text to speech2speech directly
    //  - speech2speech will return audio output, and optionally text output if audio output is enabled

    // Get current model
    const modelName =
      editorContext?.persistSettings?.assistantChatModel ?? "pulse-ai-v1";

    const chatModel = chatModels[modelName];

    if (!chatModel) {
      throw new Error(`Chat model ${modelName} not found.`);
    }

    if (chatModel.type === "speech-to-speech") {
    } else if (chatModel.type === "text-to-text") {
    } else {
      throw new Error(`Unsupported chat model type: ${chatModel.type}`);
    }
  }

  async function runSpeech2SpeechModel() {}

  async function runText2TextModel() {
    if (input.message.audio && getPlatform() === PlatformEnum.VSCode) {
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

    const text = input.content.text;

    const args = await gatherAssistantArgs(input.content.text);

    const result = await runLLMAgentMethod(
      editorAssistantAgent,
      "useAppActions",
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

  return {
    isUseManagedCloud,
    history,
    chatWithAssistant,
  };
}
