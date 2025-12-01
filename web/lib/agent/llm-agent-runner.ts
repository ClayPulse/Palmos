import { Agent, LLMModelConfig, ModelConfig } from "@pulse-editor/shared-utils";
import toast from "react-hot-toast";
import { BaseLLM } from "../modalities/llm/base-llm";
import { getLLMModel } from "../modalities/llm/get-llm";
import { getAgentTextPrompt } from "./prompt";
import { parseToonToJSON } from "./toon-parser";

export class LLMAgentRunner {
  public async run(
    modelConfig: LLMModelConfig,
    agent: Agent,
    methodName: string,
    args: Record<string, any>,
    onChunkUpdate?: (
      allReceived?: string,
      newReceived?: string,
    ) => Promise<void>,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    const method = agent.availableMethods.find((m) => m.name === methodName);
    if (!method) {
      throw new Error(`Method ${methodName} not found in agent ${agent.name}.`);
    }

    const textPrompt = await getAgentTextPrompt(agent, method, args);

    const llm = this.getLLM(modelConfig);

    if (!llm) {
      throw new Error("No suitable LLM model found.");
    }

    const result = await this.runLLM(
      llm,
      textPrompt,
      onChunkUpdate,
      abortSignal,
    );

    return result;
  }

  private getLLM(llmConfig: ModelConfig) {
    const [provider] = llmConfig.modelId.split("/");

    if (!llmConfig.apiKey) {
      toast.error(
        `No API key found for provider ${provider} when running the agent. Please add an API key in agent configuration.`,
      );
      throw new Error(`No API key found for provider ${provider}.`);
    }

    const llm = getLLMModel(llmConfig);

    return llm;
  }

  private async runLLM(
    llm: BaseLLM,
    prompt: string,
    onChunkUpdate?: (
      allReceived?: string,
      newReceived?: string,
    ) => Promise<void>,
    abortSignal?: AbortSignal,
  ) {
    const stream = await llm.generateStream(prompt);
    const reader = stream.getReader();
    let done = false;
    let result = "";

    // Handle abort signal
    const abortHandler = () => {
      reader.cancel();
      done = true;
    };

    if (abortSignal) {
      if (abortSignal.aborted) {
        reader.cancel();
        throw new Error("Request aborted");
      }
      abortSignal.addEventListener("abort", abortHandler);
    }

    try {
      while (!done) {
        const { done: readerDone, value } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = value;
          result += chunk;
          if (onChunkUpdate) {
            await onChunkUpdate(result, chunk);
          }
        }
      }
    } finally {
      if (abortSignal) {
        abortSignal.removeEventListener("abort", abortHandler);
      }
    }

    return result;
  }
}
