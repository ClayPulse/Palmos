import { EditorContext } from "@/components/providers/editor-context-provider";
import {
  AppViewConfig,
  AssistantEditorContextArgs,
  CanvasViewConfig,
  EditorAssistantMessage,
  EditorChatMessage,
  TabView,
  UserMessage,
} from "@/lib/types";
import { addToast } from "@heroui/react";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { useContext, useRef, useState } from "react";
import { Assistant } from "../editor-assistant/assistant";
import useActionExecutor from "./use-action-executor";
import { usePlatformApi } from "./use-platform-api";
import { useTabViewManager } from "./use-tab-view-manager";

export default function usePlatformAIAssistant() {
  const editorContext = useContext(EditorContext);

  const [history, setHistory] = useState<EditorChatMessage[]>([]);
  // Use refs for precise, synchronous audio scheduling to avoid race conditions.
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);

  const { platformApi } = usePlatformApi();

  const { runScopedAction, actions } = useActionExecutor();
  const { activeTabView } = useTabViewManager();

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
      projectDirTree: [],
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

    // Initialize audio player if needed
    if (isOutputAudio) {
      // Create (or resume) a single AudioContext for the session
      const ctx =
        audioContextRef.current ??
        new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") {
        // Best-effort resume in case the browser suspended it
        ctx.resume().catch(() => {});
      }
      audioContextRef.current = ctx;
      // Reset scheduling cursor for a fresh conversation to current time
      nextPlaybackTimeRef.current = ctx.currentTime;
    }

    const assistantInput: UserMessage = {
      content: {
        text: input.content.text,
        audio: input.content.audio,
      },
      attachments: [],
    };

    // Create new entry in history
    setHistory((prev) => [
      ...prev,
      { role: "user", message: assistantInput },
      {
        role: "assistant",
        message: {
          content: {},
          attachments: [],
        },
      },
    ]);

    // Send to assistant
    const assistantResult = await assistant.chat(
      assistantInput,
      {
        isOutputAudio: isOutputAudio,
      },
      editorContext.persistSettings?.assistantChatModelConfig ?? {
        sts: {
          modelId: "pulse-editor/pulse-ai-v1-turbo",
        },
      },
      "voiceAssistant",
      args,
      async (
        allReceived?: {
          text?: string;
          audio?: ArrayBuffer;
        },
        newReceived?: {
          text?: string;
          audio?: ArrayBuffer;
        },
      ) => {
        const chunk: EditorAssistantMessage = {
          content: {
            text: allReceived?.text,
            audio: allReceived?.audio,
          },
          attachments: [],
        };

        // Update history with the latest chunk
        setHistory((prev) => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1].message = chunk;
          }
          return newHistory;
        });

        // Play audio chunk sequentially if any
        if (isOutputAudio && newReceived?.audio && audioContextRef.current) {
          try {
            const ctx = audioContextRef.current;
            // Interpret incoming buffer as Float32 PCM (expected format). If different, conversion should be added.
            const samples = new Float32Array(newReceived.audio);
            if (samples.length === 0) {
              return; // Skip empty chunk
            }

            const sampleRate = 24000; // Expected input sample rate
            const buffer = ctx.createBuffer(1, samples.length, sampleRate);
            buffer.copyToChannel(samples, 0, 0);

            // Ensure strictly sequential (gapless) playback
            const now = ctx.currentTime;
            const startAt = Math.max(now, nextPlaybackTimeRef.current);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(startAt);

            // Advance cursor immediately (no async state lag)
            nextPlaybackTimeRef.current = startAt + buffer.duration;
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.error("Audio chunk playback failed:", err);
            }
          }
        }
      },
    );

    // Create new entry in history for planned actions
    setHistory((prev) => [
      ...prev,
      {
        role: "assistant",
        message: {
          content: {},
          attachments: [],
        },
      },
    ]);

    const plannerAssistant = await assistant.chat(
      {
        content: {
          text: assistantResult?.content.text || "",
        },
        attachments: [],
      },
      {
        isOutputAudio: false,
      },
      editorContext.persistSettings?.assistantChatModelConfig ?? {
        sts: {
          modelId: "pulse-editor/pulse-ai-v1-turbo",
        },
      },
      "useAppActions",
      {
        ...args,
        chatHistory: history,
      },
      async (
        allReceived?: {
          text?: string;
        },
        newReceived?: {
          text?: string;
        },
      ) => {
        const chunk: EditorAssistantMessage = {
          content: {
            text: allReceived?.text,
          },
          attachments: [],
        };

        // Update history with the latest chunk
        setHistory((prev) => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1].message = chunk;
          }
          return newHistory;
        });
      },
    );

    // Process assistant result
    await processAssistantResult(plannerAssistant);
  }

  async function processAssistantResult(
    assistantResult: EditorAssistantMessage | null,
  ) {
    if (!assistantResult || !assistantResult.content.text) {
      return;
    }

    const decodedResult = JSON.parse(assistantResult.content.text) as {
      suggestedCmd: string;
      suggestedArgs: {
        name: string;
        value: any;
      }[];
      response: string;
    };

    const { suggestedCmd, suggestedArgs } = decodedResult;

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
      addToast({
        title: "Error",
        description: `Agent suggested command ${suggestedCmd} not found.`,
        color: "danger",
      });
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
