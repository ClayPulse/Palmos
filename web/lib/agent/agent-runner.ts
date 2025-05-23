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
import { getLLMModel } from "../modalities/llm/llm";
import toast from "react-hot-toast";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

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

async function getPrompt(
  agent: Agent,
  method: AgentMethod,
  args: Record<string, any>,
) {
  const userPromptTemplate = `\
${method.prompt}

Finally, you must return a valid JSON object string. The requirements for the JSON object are as follows,
you must make sure the JSON string is parsable and valid:
\`\`\`
{{
  ${Array.from(Object.entries(method.returns)).map(
    ([key, variable]) => `"${key}": ${getVariablePrompt(variable)}`,
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
      ([key, value]) => `"${key}": ${getVariablePrompt(value)}`,
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
  else if (type === "string") { 
    return "A string value.";
  }

  return `A ${type} value`;
}
