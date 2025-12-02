import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  Agent,
  AgentMethod,
  isArrayType,
  isObjectType,
  TypedVariable,
  TypedVariableObjectType,
  TypedVariableType,
} from "@pulse-editor/shared-utils";
import { encode } from "@toon-format/toon";

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

${getReturnPrompt(method.returns)}
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

function getReturnPrompt(returnVariables: Record<string, TypedVariable>) {
  // If no return variables, return unstructured response
  if (Object.keys(returnVariables).length === 0) {
    return "You will write your response below:";
  }

  return `\
Finally, you must return a valid TOON object string in the required format. The requirements for the TOON object are as follows,
you must make sure the TOON string is parse-able and valid.

Token-Oriented Object Notation (TOON) is a new format that is compact, human-readable, schema-aware JSON for LLM prompts.
Since it's new, you have refer to examples: 
\"\"\"
Data is in TOON format (arrays show length and fields in header and end with a colon, 2-space indent for array items).

Example 1:
(users array has 3 rows/items)
\`\`\`toon
users[3]{{id,name,role,lastLogin}}:
  1,Alice,admin,"2025-01-15T 10:30:00Z"
  2,Bob,user,"2025-01-14T 15:22:00Z"
  3,Charlie,user,"2025-01-13T 09:45:00Z"
\`\`\`

Example 2:
(If an array has no item, make sure to have a colon at the end without having new indented rows. 
For example, suggestedArgs array has length 0, so no indented rows shown)
\`\`\`toon
language: English
suggestedCmd: Configure MCP Server Connection
suggestedArgs[0]{{name,value}}:
response:"Hello, I've found a useful command for you. Let's use it to set up the MCP server connection."
\`\`\`
\"\"\"

After you have learned about the rules of TOON, format your response like this in the following template 
that you need to fill and replace value with your results. 
Instruction on how to produce each return variable is given in parentheses.
Use the same header format. [N] indicates number of items/rows in an array, set it accordingly. 
Output only the code block.

${createMockToonReturnTemplate(returnVariables)}
`;
}

export function createMockToonReturnTemplate(
  returnVariables: Record<string, TypedVariable>,
): string {
  return `\
\`\`\`toon
${encode({
  ...Object.fromEntries(
    Object.entries(returnVariables).map(([key, variable]) => [
      key,
      getReturnVariablePrompt(variable),
    ]),
  ),
})
  .replaceAll("{", "{{")
  .replaceAll("}", "}}")}
\`\`\`
`;
}

function getReturnVariablePrompt(
  variable: TypedVariable,
  isEllipsis = false,
): any {
  const typePrompt = getReturnVariableTypePrompt(variable.type);

  if (isArrayType(variable.type)) {
    // Mock a sample array for TOON format

    // Recursively get inner type
    const innerType = variable.type[0];
    return [
      // Striping the array wrapper
      getReturnVariablePrompt({ ...variable, type: innerType }),
      getReturnVariablePrompt({ ...variable, type: innerType }, true),
    ];
  } else if (isObjectType(variable.type)) {
    const objectType = variable.type as TypedVariableObjectType;

    const properties: Record<string, any> = {};

    // For each property, recursively get the prompt
    Object.entries(objectType).forEach(([key, value]) => {
      properties[key] = isEllipsis ? "..." : getReturnVariablePrompt(value);
    });

    return properties;
  } else {
    return isEllipsis
      ? "..."
      : `(Enter your response here, make sure to escape double quotes. Return type: ${typePrompt} Description: ${variable.description}.)`;
  }
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
