import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
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
import toast from "react-hot-toast";
import { getLLMModel } from "../modalities/llm/llm";
import { fetchAPI } from "../pulse-editor-website/backend";
import { parseJsonChunk } from "./stream-chunk-parser";

export function getAgentLLMConfig(agent: Agent, methodName: string) {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  return method?.LLMConfig ? method.LLMConfig : agent.LLMConfig;
}

export async function runAgentMethodCloud(
  agent: Agent,
  methodName: string,
  args: Record<string, any>,
  onChunkUpdate?: (chunk: any) => void,
): Promise<any> {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  if (!method) {
    throw new Error(`Method ${methodName} not found in agent ${agent.name}.`);
  }

  const prompt = await getAgentPrompt(agent, method, args);

  const response = await fetchAPI(
    "/api/inference/platform-assistant/text-to-text",
    {
      method: "POST",
      body: JSON.stringify({ prompt }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    toast.error(`Error: ${error}`);
    return;
  }
  const stream = response.body;
  if (!stream) {
    toast.error("Error: No response from server.");
    return;
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  let result: any;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: !done });
      const parsedChunks = parseJsonChunk(chunk);

      const latestChunkValue = parsedChunks[parsedChunks.length - 1];

      result = latestChunkValue;

      if (onChunkUpdate) {
        onChunkUpdate(latestChunkValue);
      }
    }
  }

  return result;
}

export async function runAgentMethodLocal(
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

  const prompt = await getAgentPrompt(agent, method, args);

  const llmResult = await llm.generate(prompt, abortSignal);
  console.log("LLM result: ", llmResult);

  const returns = await extractReturns(llmResult);

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

  const llm = getLLMModel(
    apiKey,
    provider,
    llmConfig.modelName,
    llmConfig.temperature,
  );

  return llm;
}

export async function getAgentPrompt(
  agent: Agent,
  method: AgentMethod | string,
  args: Record<string, any>,
) {
  if (typeof method === "string") {
    const foundMethod = agent.availableMethods.find((m) => m.name === method);
    if (!foundMethod) {
      throw new Error(`Method ${method} not found in agent ${agent.name}.`);
    }
    method = foundMethod;
  }

  const userPromptTemplate = `\
${method.prompt}

Finally, you must return a valid JSON object string in the required format. The requirements for the JSON object are as follows,
you must make sure the JSON string is parse-able and valid:
\`\`\`
{{
  ${Array.from(Object.entries(method.returns)).map(
    ([key, variable]) => `"${key}": ${getReturnVariablePrompt(variable)}`,
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

async function extractReturns(result: string): Promise<Record<string, any>> {
  const parser = new JsonOutputParser();
  const parsed = await parser.parse(result);

  return parsed;
}

function getReturnVariablePrompt(variable: TypedVariable) {
  const typePrompt = getReturnVariableTypePrompt(variable.type);

  return `(Return type: ${typePrompt} Description: ${variable.description}.)`;
}

function getReturnVariableTypePrompt(type: TypedVariableType): string {
  if (isArrayType(type)) {
    const innerType = type[0];

    const typePrompt = getReturnVariableTypePrompt(innerType);

    return `An array of values, where each value is ${typePrompt}`;
  } else if (isObjectType(type)) {
    const objectType = type as TypedVariableObjectType;

    const properties = Object.entries(objectType).map(
      ([key, value]) => `"${key}": ${getReturnVariablePrompt(value)}`,
    );

    const typePrompt = `An object with the following properties: 
"""
{{
  ${properties.join(", ")}
}}
"""
`;

    return typePrompt;
  } else if (type === "string") {
    return "A string value.";
  }

  return `A ${type} value`;
}
