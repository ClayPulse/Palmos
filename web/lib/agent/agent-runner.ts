import { Agent, AgentMethod, LLMConfig } from "@pulse-editor/shared-utils";
import { getModelLLM } from "../llm/llm";
import toast from "react-hot-toast";

export async function runAgentMethod(
  apiKey: string,
  llmConfig: LLMConfig,
  agent: Agent,
  method: AgentMethod,
  args: Record<string, any>,
  abortSignal?: AbortSignal,
): Promise<Record<string, any>> {
  const llm = getLLM(llmConfig, agent.name, apiKey);

  if (!llm) {
    throw new Error("LLM not found.");
  }

  const prompt = getPrompt(agent, method, args);

  const llmResult = await llm.generate(prompt, abortSignal);

  const returns = extractReturns(llmResult);

  return returns;
}

function getLLM(llmConfig: LLMConfig, agentName: string, apiKey: string) {
  const provider = llmConfig.provider;

  console.log("LLM Config", llmConfig);

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
