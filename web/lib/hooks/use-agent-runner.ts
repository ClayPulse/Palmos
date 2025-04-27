import { Agent, AgentMethod, LLMConfig } from "@pulse-editor/shared-utils";
import { getModelLLM } from "../llm/llm";
import { useContext } from "react";
import { EditorContext } from "@/components/providers/editor-context-provider";
import toast from "react-hot-toast";

export default function useAgentRunner() {
  const editorContext = useContext(EditorContext);

  async function runAgentMethod(
    agent: Agent,
    methodName: string,
    args: Record<string, any>,
    abortSignal?: AbortSignal,
  ): Promise<Record<string, any>> {
    const method = agent.availableMethods.find(
      (method) => method.name === methodName,
    );

    if (!method) {
      throw new Error("Agent method not found.");
    }

    // Get the LLM config required for this method.
    const llmConfig = method.LLMConfig ? method.LLMConfig : agent.LLMConfig;
    const llm = getLLM(llmConfig, agent.name);

    if (!llm) {
      throw new Error("LLM not found.");
    }

    const prompt = getPrompt(agent, method, args);

    const llmResult = await llm.generate(prompt, abortSignal);

    const returns = extractReturns(llmResult);

    return returns;
  }

  function getAPIKey(provider: string) {
    if (!editorContext?.persistSettings?.apiKeys) {
      return undefined;
    }

    const apiKey = editorContext?.persistSettings?.apiKeys[provider];

    if (!apiKey) {
      return undefined;
    }

    return apiKey;
  }

  function getLLM(llmConfig: LLMConfig, agentName: string) {
    const provider = llmConfig.provider;

    const apiKey = getAPIKey(provider);

    if (!apiKey) {
      toast.error(
        `No API key found for provider ${provider} when running the agent ${agentName}. Please add an API key in agent configuration.`,
      );
      throw new Error(`No API key found for provider ${provider}.`);
    }

    const llm = getModelLLM(
      apiKey,
      provider,
      llmConfig.modelName,
      llmConfig.temperature,
    );

    return llm;
  }

  function getPrompt(
    agent: Agent,
    method: AgentMethod,
    args: Record<string, any>,
  ) {
    const prompt = `\
${agent.systemPrompt}

${method.prompt.replace(/{(.*?)}/g, (match, key) => args[key])}

Finally, you must return a JSON object. Each field in the object has a corresponding type, \
format, and explanation (after //). Your response must match the following:
\`\`\`
{
  ${Array.from(Object.entries(method.returns)).map(
    ([key, variable]) => `${key}: ${variable.type}, // ${variable.description}`,
  )}
}
\`\`\`
`;
    return prompt;
  }

  function extractReturns(result: string): Record<string, any> {
    result = result
      .replace(/^```(?:json)?/, "")
      .replace(/```$/, "")
      .trim();
    const llmResultJson = JSON.parse(result);
    return llmResultJson;
  }

  return { runAgentMethod };
}
