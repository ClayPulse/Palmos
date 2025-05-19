import {
  Agent,
  AgentMethod,
  LLMConfig,
  TypedVariable,
  TypedVariableObjectType,
  TypedVariableType,
  isArrayType,
  isObjectType,
} from "@pulse-editor/shared-utils";
import { getModelLLM } from "../llm/llm";
import toast from "react-hot-toast";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export function getAgentLLMConfig(agent: Agent, methodName: string) {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  return method?.LLMConfig ? method.LLMConfig : agent.LLMConfig;
}

export async function runAgentMethod(
  apiKey: string,
  llmConfig: LLMConfig,
  agent: Agent,
  methodName: string,
  args: Record<string, any>,
  abortSignal?: AbortSignal,
): Promise<any> {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  if (!method) {
    throw new Error(`Method ${methodName} not found in agent ${agent.name}.`);
  }

  const llm = getLLM(llmConfig, agent.name, apiKey);

  if (!llm) {
    throw new Error("LLM not found.");
  }

  const prompt = await getPrompt(agent, method, args);

  console.log("Prompt: ", prompt);

  const llmResult = await llm.generate(prompt, abortSignal);

  const returns = extractReturns(llmResult);

  console.log("Agent result: ", returns);

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

async function getPrompt(
  agent: Agent,
  method: AgentMethod,
  args: Record<string, any>,
) {
  const userPromptTemplate = `\
${method.prompt}

Finally, you must return a JSON object. The requirements for the JSON object are as follows:
\`\`\`
{{
  ${Array.from(Object.entries(method.returns)).map(
    ([key, variable]) => `${key}: ${getVariablePrompt(variable)}`,
  )}
}}
\`\`\`
`;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", agent.systemPrompt],
    ["user", userPromptTemplate],
  ]);

  const prompt = await promptTemplate.invoke({
    ...args,
  });

  return prompt.toString();
}

function extractReturns(result: string): Record<string, any> {
  result = result
    .replace(/^```(?:json)?/, "")
    .replace(/```$/, "")
    .trim();
  const llmResultJson = JSON.parse(result);
  return llmResultJson;
}

function getVariablePrompt(variable: TypedVariable) {
  const typePrompt = getVariableTypePrompt(variable.type);

  return `(Return type: ${typePrompt}. Description: ${variable.description}.)`;
}

function getVariableTypePrompt(type: TypedVariableType): string {
  if (isArrayType(type)) {
    const innerType = type[0];

    const typePrompt = getVariableTypePrompt(innerType);

    return `An array of values, where each value is ${typePrompt}`;
  } else if (isObjectType(type)) {
    const objectType = type as TypedVariableObjectType;

    const properties = Object.entries(objectType).map(
      ([key, value]) => `${key}: ${getVariablePrompt(value)}`,
    );

    const typePrompt = `An object with the following properties: 
\`\`\`
{{
  ${properties.join(", ")}
}}
\`\`\`
`;

    return typePrompt;
  }

  return `A ${type} value`;
}
