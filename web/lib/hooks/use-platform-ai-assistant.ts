import { EditorContext } from "@/components/providers/editor-context-provider";
import {
  AppViewConfig,
  AssistantEditorContextArgs,
  CanvasViewConfig,
  PlatformAssistantHistory,
  PlatformAssistantMessage,
  TabView,
  UserMessage,
} from "@/lib/types";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { decode } from "@toon-format/toon";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Assistant } from "../editor-assistant/assistant";
import useActionExecutor from "./use-action-executor";
import { usePlatformApi } from "./use-platform-api";
import useSpeech2Speech from "./use-speech2speech";
import { useTabViewManager } from "./use-tab-view-manager";
import useTTS from "./use-tts";

export default function usePlatformAIAssistant() {
  const editorContext = useContext(EditorContext);

  const [history, setHistory] = useState<PlatformAssistantHistory[]>([]);

  const { platformApi } = usePlatformApi();

  const { runSpeech2Speech, stopSpeech2Speech, isRunning } = useSpeech2Speech();
  const { readText, playAudio } = useTTS();
  const { runScopedAction, actions } = useActionExecutor();
  const { activeTabView } = useTabViewManager();

  const [analysisAudio, setAnalysisAudio] = useState<Blob | undefined>(
    undefined,
  );

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

  async function gatherAssistantArgs(): Promise<AssistantEditorContextArgs> {
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
      activeTabView: tabView?.config.viewId ?? "undefined",
      availableCommands: gatherActions(),
      projectDirTree: await gatherProjectDirTree(),
    };
  }

  /**
   * Run the assistant with the given input and output settings.
   * @param input User input, can be one of either audio (ReadableStream) or text (string).
   * @param isOutputAudio Whether the output should be audio.
   */
  async function chatWithAssistant(input: UserMessage, isOutputAudio: boolean) {
    if (!editorContext) {
      return;
    }

    const assistant = new Assistant();

    // Prepare assistant input
    const args = await gatherAssistantArgs();

    const assistantInput: UserMessage = {
      content: {
        text: input.content.text,
        audio: input.content.audio,
      },
      attachments: [],
    };

    // Send to assistant
    const result = await assistant.chat(
      assistantInput,
      {
        isOutputAudio: isOutputAudio,
      },
      editorContext.persistSettings?.assistantChatModelConfig ?? {
        sts: {
          modelId: "pulse-editor/pulse-ai-v1-turbo",
        },
      },
      args,
    );

    // Process assistant result
    await processAssistantResult(result);
  }

  async function processAssistantResult(
    assistantResult: PlatformAssistantMessage | null,
  ) {
    if (!assistantResult || !assistantResult.content.text) {
      return;
    }

    const { suggestedCmd, suggestedArgs } = decode(
      assistantResult.content.text,
    ) as {
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: any;
      }[];
      response: string;
    };

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

    editorContext?.setEditorStates((prev) => ({
      ...prev,
      isThinking: false,
    }));
  }

  /* TODO: Let agent to review command results */

  // // When the assistant agent is done analyzing the command result, we can
  // // play the analysis result to the user.
  // useEffect(() => {
  //   if (pendingAnalysis.length > 0) {
  //     if (!isRunning) {
  //       // Show thinking indicator
  //       editorContext?.setEditorStates((prev) => ({
  //         ...prev,
  //         isThinking: true,
  //         thinkingText: "Analyzing command result...",
  //       }));
  //     }
  //     readText(pendingAnalysis).then((blob) => {
  //       setPendingAnalysis("");
  //       setAnalysisAudio(blob);
  //     });
  //   }
  // }, [pendingAnalysis, isRunning]);

  // const previousMessage = history[history.length - 1].message.content.text;
  // const { analysis }: { analysis: string } = await runLLMAgentMethod(
  //   editorAssistantAgent,
  //   "analyzeCommandResult",
  //   {
  //     userMessage: userVoiceMessage,
  //     suggestedCmd: suggestedCmd,
  //     previousSuggestion: response,
  //     commandResult: actionResult,
  //   },
  //   (allReceivedChunk, newReceivedChunk) => {
  //     if (!chunk.content.text) {
  //       return;
  //     }
  //     const textJson = JSON.parse(chunk.content.text);

  //     if (!textJson.analysis) {
  //       return;
  //     }
  //     // Update this in the history
  //     setHistory((prev) => {
  //       const newHistory = [...prev];
  //       if (newHistory.length > 0) {
  //         newHistory[newHistory.length - 1].message.content.text =
  //           previousMessage + "\n\n### Result:\n" + textJson.analysis;
  //       }
  //       return newHistory;
  //     });
  //   },
  // );
  // if (process.env.NODE_ENV === "development") {
  //   console.log("Command analysis:", analysis);
  // }

  return {
    history,
    chatWithAssistant,
  };
}
