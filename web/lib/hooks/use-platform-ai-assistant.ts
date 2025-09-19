import { useContext, useEffect, useState } from "react";
import useSpeech2Speech from "./use-speech2speech";
import useTTS from "./use-tts";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { getAPIKey } from "@/lib/settings/api-manager-utils";
import { editorAssistantAgent } from "@/lib/agent/built-in-agents/editor-assistant";
import { getAgentLLMConfig, runAgentMethod } from "@/lib/agent/agent-runner";
import { getPlatform } from "@/lib/platform-api/platform-checker";
import { PlatformEnum } from "@/lib/types";
import toast from "react-hot-toast";
import { getDefaultLLMConfig } from "@/lib/modalities/utils";
import { usePlatformApi } from "./use-platform-api";
import useCommands from "./use-commands";
import { useTabViewManager } from "./use-tab-view-manager";

export default function usePlatformAIAssistant() {
  const editorContext = useContext(EditorContext);

  const { platformApi } = usePlatformApi();
  const { runSpeech2Speech, stopSpeech2Speech, isRunning } = useSpeech2Speech();
  const { readText, playAudio } = useTTS();
  const { runCommand, commands } = useCommands();
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

      const command = getAgentSuggestedCommands("", 1);
      if (!command) {
        toast.error(`Agent suggested command ${suggestedCmd} not found.`);
        return;
      }

      const cmdResult = await runCommand(command, args);

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
          commands: commands.map((commandInTab) => ({
            cmd: commandInTab.commandInfo.name,
            parameters: Object.entries(commandInTab.commandInfo.parameters).map(
              ([key, value]) => ({
                name: key,
                type: value.type,
                description: value.description,
              }),
            ),
            description: commandInTab.commandInfo.description,
            viewId: commandInTab.viewId,
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

        console.log("Agent suggestion:", result);

        setAssistantResult(result);

        return response;
      });
    } else {
      stopSpeech2Speech();
    }
  }

  async function runAssistant(isUseVoice: boolean) {
    handleMicFinished();
  }

  function getAgentSuggestedCommands(query: string, k: number) {
    return undefined;
  }

  return {
    runAssistant,
  };
}
