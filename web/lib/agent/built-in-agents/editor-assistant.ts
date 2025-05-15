import { llmProviderOptions } from "@/lib/llm/options";
import { AccessEnum, Agent } from "@pulse-editor/shared-utils";

export const editorAssistantAgent: Agent = {
  name: "Editor Assistant",
  version: "0.1.0",
  systemPrompt: `\
You are an AI assistant agent for a creativity platform called Pulse Editor.
In Pulse Editor, users can create and edit text, images, videos, audio,
code, and many other types of content (the opportunity is endless).
Pulse Editor enables users to create and edit content using a variety of extensions
published by the community. In addition, Pulse Editor embeds many AI models to help
users create and editor content in multiple modalities. The purpose of Pulse Editor
is to use AI tools to better assist and accelerate users' creative process.

You are a helpful platform-level assistant agent that can help users with the following tasks:
1. Answer questions about the platform and its features.
2. Provide information about the available extensions and AI models.
3. Suggest relevant workflows and tools for specific tasks.
e.g. If a user wants to create a promotional video, you can suggest first using
a script generator extension from community marketplace, then using a video
editor extension to edit the video, and finally using a voice generator extension to add voiceover. 
4. Assist users in troubleshooting common issues.
\`\`\`
`,
  description:
    "A platform-level assistant agent that can help users with Pulse Editor and its features.",
  availableMethods: [
    {
      access: AccessEnum.public,
      name: "determineTask",
      parameters: {
        userMessage: {
          name: "userMessage",
          type: "string",
          description:
            "The user's input or question about the platform or its features.",
        },
      },
      prompt: "",
      returns: {
        task: {
          name: "task",
          type: "string",
          description:
            "The task that the user is trying to accomplish based on their input.",
        },
      },
    },
    {
      access: AccessEnum.public,
      name: "useExtensionCommands",
      parameters: {},
      prompt: "",
      returns: {},
    },
    {
      access: AccessEnum.public,
      name: "suggestExtensions",
      parameters: {
        userMessage: {
          name: "userMessage",
          type: "string",
          description:
            "The user's input or question about the platform or its features.",
        },
      },
      prompt: `\
You will receive a user's message, which may contain a question or a request for assistance.
Your task is to provide a helpful response based on the user's input.

Remember, you will not directly assist the user in creating or editing content, as you are not
an application-level assistant agent. Instead, you will provide information and guidance to help users
to navigate the platform and its extensions. However, you are able to call the application-level
assistant agent to perform tasks on behalf of the user. These application-level assistant agents are exposed
as part of an extension. You can call one of these assistant agents by outputting a message in the
following format:
\`\`\`
{{
  "agent": (a string representing the name of the agent),
  "method": (a string representing the name of the method),
  "parameters": (a JSON object representing the parameters to be passed to the method),
}}

You are given the following information about the conversation.
Chat history:
\`\`\`
{chatHistory}
\`\`\`
User message:
\`\`\`
{userMessage}
\`\`\`
Available application-level assistant agents:
\`\`\`
{availableAgents}
\`\`\`


You will respond in the following format:
\`\`\`
{{
  "agentSuggestions": (an array of JSON objects representing the suggestions for application-level agents.
Empty array if you cannot find any suitable agents. Each object should be in the following format:
  {{
    "agent": (a string representing the name of the agent),
    "method": (a string representing the name of the method),
    "parameters": (a JSON object representing the parameters to be passed to the method),
  }}.
  ),
  "response": (a string representing the platform-level assistant agent's message to the user),
}}
\`\`\`
`,
      returns: {
        response: {
          name: "response",
          type: "string",
          description:
            "The platform-level assistant agent's response to the user's input or question.",
        },
      },
    },
  ],
  LLMConfig: {
    provider: llmProviderOptions.openai.provider,
    modelName: "gpt-4o",
    temperature: 0.7,
  },
};
