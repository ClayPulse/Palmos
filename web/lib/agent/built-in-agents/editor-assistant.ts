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

You are a helpful platform-level assistant agent who can help users with the following tasks:
1. Answer questions about the platform and its features.
2. Provide information about the available extensions, extension commands, and AI models.
3. Suggest relevant workflows and tools for specific tasks.
e.g. If a user wants to create a promotional video, you can suggest first using
a script generator extension from community marketplace, then using a video
editor extension to edit the video, and finally using a voice generator extension to add voiceover. 
4. Assist users in troubleshooting common issues for the editor itself. If a user asks anything
about an extension, you should suggest the user to visit the extension's marketplace page and/or
contact the extension developer.

You will receive a message from user, which may contain a question or a request for assistance.
Your task is to provide a helpful response based on the user's input.

Remember, you will not directly assist the user in creating or editing content, as you are not
an application-level assistant agent. Instead, you will provide information and guidance to help users
to navigate the platform and its extensions.
`,
  description: `A platform-level assistant agent who can help users with Pulse Editor, \
Pulse Editor extensions and its features.`,
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
      prompt: "(WIP)",
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
      parameters: {
        chatHistory: {
          name: "chatHistory",
          type: "string",
          description: "The chat history between the user and you.",
        },
        userMessage: {
          name: "userMessage",
          type: "string",
          description: "The user's message.",
        },
        openedViews: {
          name: "openedViews",
          type: [
            {
              viewId: {
                name: "viewId",
                type: "string",
                description: "The ID of an opened view visible to user.",
              },
              isFocused: {
                name: "isFocused",
                type: "boolean",
                description:
                  "Whether the view is currently focused by cursor or not.",
              },
              file: {
                name: "file",
                type: {
                  content: {
                    name: "content",
                    type: "string",
                    description: "The content of the file in this view.",
                  },
                  path: {
                    name: "path",
                    type: "string",
                    description: "The path of the file in this view.",
                  },
                  selection: {
                    name: "selection",
                    type: [
                      {
                        lineStart: {
                          name: "lineStart",
                          type: "number",
                          description:
                            "The line number of the start of the selection.",
                        },
                        lineEnd: {
                          name: "lineEnd",
                          type: "number",
                          description:
                            "The line number of the end of the selection.",
                        },
                        text: {
                          name: "text",
                          type: "string",
                          description:
                            "The text of the selection in this view.",
                        },
                      },
                    ],
                    description:
                      "The selection(s) of the file in this view. This is optional.",
                  },
                },
                description:
                  "The file that the view is currently opened on. This is optional. Undefined if the view does not open a file.",
                optional: true,
              },
              extensionConfig: {
                name: "extensionConfig",
                type: {
                  id: {
                    name: "id",
                    type: "string",
                    description: "The module ID of the extension.",
                  },
                },
                description:
                  "The configuration of the extension/module that the view belongs to.",
              },
            },
          ],
          description: `The list of opened views that are visible to the user. \
You will need to use these as the context to suggest the user to interact \
with Pulse Editor and extension commands.`,
        },
        commands: {
          name: "commands",
          type: [
            {
              cmd: {
                name: "cmd",
                type: "string",
                description:
                  "The name of the command that the user is trying to use from the extension.",
              },
              parameters: {
                name: "parameters",
                type: [
                  {
                    name: {
                      name: "name",
                      type: "string",
                      description:
                        "The name of the parameter needed to run the command from the extension.",
                    },
                    type: {
                      name: "type",
                      type: "string",
                      description:
                        "The type of the parameter needed to run the command from the extension.",
                    },
                    description: {
                      name: "description",
                      type: "string",
                      description:
                        "The description of the parameter needed to run the command from the extension.",
                    },
                    moduleId: {
                      name: "moduleId",
                      type: "string",
                      description: `The ID of the extension/module that the command belongs to. \
This command can only be run on extension with this module ID.`,
                    },
                  },
                ],
                description:
                  "The parameters needed to run the command from the extension.",
              },
            },
          ],
          description:
            "The commands that the user is trying to use from the extension.",
        },
      },
      prompt: `\
For this task, you will suggest extension commands that fit the user's needs.
You are given the following information about the conversation and the available commands.

Chat history:
\`\`\`
{chatHistory}
\`\`\`
User message:
\`\`\`
{userMessage}
\`\`\`
Opened views:
\`\`\`
{openedViews}
\`\`\`
Available commands:
\`\`\`
{commands}
\`\`\`
`,
      returns: {
        suggestedCmd: {
          name: "suggestedCmd",
          type: "string",
          description:
            "The command that you suggest the user to try for their needs.",
        },
        suggestedArgs: {
          name: "suggestedArgs",
          type: [
            {
              name: {
                name: "name",
                type: "string",
                description:
                  "The name of the argument needed to run the command from the extension.",
              },
              value: {
                name: "value",
                type: "string",
                description:
                  "The value that you suggest for the user to run the command from the extension.",
              },
            },
          ],
          description: `The arguments that you suggested for user to run the command from the extension. \
This must match the command's parameters provided earlier.`,
        },
        suggestedViewId: {
          name: "suggestedViewId",
          type: "string",
          description:
            "The ID of the view (usually a uuid) that you suggest the user to run the command on. \
Note, this is not the same as the module/extension ID (usually a named ID). In order to suggest a view ID, \
you must match the commands' module ID (named ID) with the opened views' extensionConfig.id (named ID). \
If a command and an opened view has the same extension/module ID (named ID), you can use that \
opened view's ID (uuid) as the suggested view ID.",
        },
        response: {
          name: "response",
          type: "string",
          description: `The platform-level assistant agent's response to the user's input or question. \
Explain in a friendly way to the user that you will call the command for them, and explain the reasoning behind \
picking the command and values of the arguments. If a command is suggested, you will let the user know \
that you will execute this command for them and wait for the response to further analyze its effects. \
Keep your response short and concise but informative in 2-3 sentences unless the user wants a detailed \
explanation. `,
        },
      },
    },
    {
      access: AccessEnum.public,
      name: "suggestExtensions",
      parameters: {
        chatHistory: {
          name: "chatHistory",
          type: "string",
          description: "The chat history between the user and you.",
        },
        userMessage: {
          name: "userMessage",
          type: "string",
          description: "The user's message.",
        },
        relevantExtensions: {
          name: "relevantExtensions",
          type: {
            name: {
              name: "name",
              type: "string",
              description: "The name of the extension",
            },
            description: {
              name: "description",
              type: "string",
              description: "The description of the extension",
            },
          },
          description:
            "The relevant extensions that are available in the marketplace.",
        },
      },
      prompt: `\
For this task, you will suggest extensions from marketplace that fit the user's needs.
You are given the following information about the conversation and the available extensions.

Chat history:
\`\`\`
{chatHistory}
\`\`\`
User message:
\`\`\`
{userMessage}
\`\`\`
Relevant extensions:
\`\`\`
{relevantExtensions}
\`\`\`
`,
      returns: {
        extensionSuggestions: {
          name: "extensionSuggestions",
          type: [
            {
              name: {
                name: "name",
                type: "string",
                description: "The name of the extension",
              },
              description: {
                name: "description",
                type: "string",
                description: "The description of the extension",
              },
            },
          ],
          description: `The extension suggestions.`,
        },
        response: {
          name: "response",
          type: "string",
          description:
            "The platform-level assistant agent's response to the user's input or question.",
        },
      },
    },
    {
      access: AccessEnum.public,
      name: "analyzeCommandResult",
      parameters: {
        userMessage: {
          name: "userMessage",
          type: "string",
          description: "The user's message.",
        },
        suggestedCmd: {
          name: "suggestedCmd",
          type: "string",
          description:
            "The command that you suggested earlier for the user to try for their needs.",
        },
        previousSuggestion: {
          name: "previousSuggestion",
          type: "string",
          description:
            "The previous suggestion you made to the user before running the command.",
        },
        commandResult: {
          name: "commandResult",
          type: "string",
          description: "The command returns this result.",
        },
      },
      prompt: `\
For this task, you will analyze the result of the command that was run.
You are given the following information about the command result.

Original user message:
\`\`\`
{userMessage}
\`\`\`
Suggested command from your previous response:
\`\`\`
{suggestedCmd}
\`\`\`
Your previous suggestion:
\`\`\`
{previousSuggestion}
\`\`\`
Command result:
\`\`\`
{commandResult}
\`\`\`
`,
      returns: {
        analysis: {
          name: "analysis",
          type: "string",
          description:
            "The analysis of the command result and its relevance to the user's needs. \
Acknowledge command result in a friendly way to the user what the command result did. \
Keep your response short and concise but informative in 2-3 sentences.",
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
