import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  Agent,
  AgentMethod,
  TypedVariable,
  TypedVariableObjectType,
  TypedVariableType,
  isArrayType,
  isObjectType,
} from "@pulse-editor/shared-utils";
import { encode } from "@toon-format/toon";
import toast from "react-hot-toast";
import { BaseLLM } from "../modalities/llm/base-llm";
import { getLLMModel } from "../modalities/llm/get-llm";

export function getAgentLLMConfig(agent: Agent, methodName: string) {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  return method?.LLMConfig ? method.LLMConfig : agent.LLMConfig;
}

/* LLM only */
export async function runLLMAgentMethod(
  modelConfig: {
    provider: string;
    modelName: string;
    temperature?: number;
    apiKey?: string;
  },
  agent: Agent,
  methodName: string,
  args: Record<string, any>,
  onChunkUpdate?: (allReceived?: string, newReceived?: string) => Promise<void>,
): Promise<string> {
  const method = agent.availableMethods.find((m) => m.name === methodName);
  if (!method) {
    throw new Error(`Method ${methodName} not found in agent ${agent.name}.`);
  }

  const textPrompt = await getAgentTextPrompt(agent, method, args);

  const llm = getLLM(modelConfig);

  if (!llm) {
    throw new Error("No suitable LLM model found.");
  }

  const result = await runLLM(llm, textPrompt, onChunkUpdate);

  // Strip leading/trailing markdown code fences if present
  const codeFenceRegex = /^```toon\n([\s\S]*?)\n```$/;
  const match = result.match(codeFenceRegex);
  const cleanedResult = match ? match[1] : result;

  return cleanedResult;
}

export async function getAgentTextPrompt(
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

  const methodPrompt = `\
${method.prompt}

Parameters:
\`\`\`toon
${encode(args).replaceAll("{", "{{").replaceAll("}", "}}")}
\`\`\`
`;

  const userPromptTemplate = `\
${methodPrompt}

Finally, you must return a valid TOON object string in the required format. The requirements for the TOON object are as follows,
you must make sure the TOON string is parse-able and valid.

Token-Oriented Object Notation (TOON) is a new format that is compact, human-readable, schema-aware JSON for LLM prompts.
Since it's new, you have refer to this example: 
\"\"\"
Data is in TOON format (2-space indent, arrays show length and fields).

\`\`\`toon
users[3]{{id,name,role,lastLogin}}:
  1,Alice,admin,"2025-01-15T 10:30:00Z"
  2,Bob,user,"2025-01-14T 15:22:00Z"
  3,Charlie,user,"2025-01-13T 09:45:00Z"
\`\`\`
\"\"\"

After you have learned about the rules of TOON, format your response like this the following. 
Instruction on how to produce each return variable is given in parentheses after each variable name.
\`\`\`toon
${encode({
  ...Object.fromEntries(
    Object.entries(method.returns).map(([key, variable]) => [
      key,
      getReturnVariablePrompt(variable),
    ]),
  ),
})}
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

function getReturnVariablePrompt(variable: TypedVariable) {
  const typePrompt = getReturnVariableTypePrompt(variable.type);

  return `(Enter your response here. Return type: ${typePrompt} Description: ${variable.description}.)`;
}

function getReturnVariableTypePrompt(type: TypedVariableType): string {
  if (isArrayType(type)) {
    const innerType = type[0];

    const typePrompt = getReturnVariableTypePrompt(innerType);

    return `An array of values, where each value is ${typePrompt}`;
  } else if (isObjectType(type)) {
    const objectType = type as TypedVariableObjectType;

    const properties: Record<string, string> = {};
    Object.entries(objectType).forEach(([key, value]) => {
      properties[key] = getReturnVariableTypePrompt(value.type);
    });

    const typePrompt = `an object with the following properties: 
"""
${encode(properties)}
"""
`;

    return typePrompt;
  } else if (type === "string") {
    return "A string value.";
  }

  return `A ${type} value`;
}

function getLLM(llmConfig: {
  provider: string;
  modelName: string;
  temperature?: number;
  apiKey?: string;
}) {
  const provider = llmConfig.provider;

  if (!llmConfig.apiKey) {
    toast.error(
      `No API key found for provider ${provider} when running the agent. Please add an API key in agent configuration.`,
    );
    throw new Error(`No API key found for provider ${provider}.`);
  }

  const llm = getLLMModel(llmConfig);

  return llm;
}

async function runLLM(
  llm: BaseLLM,
  prompt: string,
  onChunkUpdate?: (allReceived?: string, newReceived?: string) => Promise<void>,
) {
  const stream = await llm.generateStream(prompt);
  const reader = stream.getReader();
  let done = false;
  let result = "";

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = value;
      result += chunk;
      if (onChunkUpdate) {
        onChunkUpdate(result, chunk);
      }
    }
  }

  return result;
}
