import { llmProviderOptions } from "@/lib/modalities/llm/options";
import { AccessEnum, Agent } from "@pulse-editor/shared-utils";

export const editorAssistantAgent: Agent = {
  name: "EditorAssistant",
  version: "0.1.0",
  systemPrompt: `\
You are an AI assistant agent for a creativity platform called Pulse Editor.
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


Knowledge about Pulse Editor:
\`\`\`
Pulse Editor is a modular, extensible, cross-platform, AI-powered creativity platform
that helps users create and automate creative workflows for numerous tasks.
In Pulse Editor, users can create and edit text, images, videos, audio,
code, and many other types of content (the opportunity is endless).
Pulse Editor enables users to create and edit content using a variety of extensions
published by the community. In addition, Pulse Editor embeds many AI models to help
users create and editor content in multiple modalities. The purpose of Pulse Editor
is to use AI tools to better assist and accelerate users' creative process.
If the user needs to learn more about Pulse Editor, encourage them to visit the official website
at https://pulse-editor.com or the GitHub community https://github.com/claypulse/pulse-editor.
\`\`\`

`,
  description: `A platform-level assistant agent who can help users with Pulse Editor, \
Pulse Editor extensions and its features.`,
  availableMethods: [
    {
      access: AccessEnum.public,
      name: "determineTask",
      parameters: {
        userMessage: {
          type: "string",
          description:
            "The user's input or question about the platform or its features.",
        },
      },
      prompt: "(WIP)",
      returns: {
        task: {
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
          type: "string",
          description: "The chat history between the user and you.",
        },
        userMessage: {
          type: "string",
          description: "The user's message.",
        },
        activeTabView: {
          type: [
            {
              type: {
                type: "string",
                description:
                  "The type of the view. This can be 'App' or 'Canvas'",
              },
              config: {
                type: {
                  viewId: {
                    type: "string",
                    description: "The ID of an opened view visible to user.",
                  },
                  // AppViewConfig
                  app: {
                    type: "string",
                    description:
                      "The ID of the app that the view is using. This field exists if the view type is 'App'.",
                    optional: true,
                  },
                  fileUri: {
                    type: "string",
                    description:
                      "The URI of the file that the app is opened with. This field exists if the view type is 'App'.",
                    optional: true,
                  },
                  // CanvasViewConfig
                  workflow: {
                    type: "any",
                    description: `The workflow that the canvas is using. This contains nodes and edges information required for a xyflow/ReactFlow graph. \
This field exists if the view type is 'Canvas'.`,
                    optional: true,
                  },
                  appConfigs: {
                    type: [
                      {
                        // AppViewConfig
                        app: {
                          type: "string",
                          description:
                            "The ID of the app that the view is using. This field exists if the view type is 'App'.",
                          optional: true,
                        },
                        fileUri: {
                          type: "string",
                          description:
                            "The URI of the file that the app is opened with. This field exists if the view type is 'App'.",
                          optional: true,
                        },
                      },
                    ],
                    description: `The list of app configurations that are opened in the canvas. \
This field exists if the view type is 'Canvas'.`,
                    optional: true,
                  },
                },
                description: `The configuration of the view. \
This is an object that contains different fields based on the view type.`,
              },
            },
          ],
          description: `The list of opened views that are visible to the user. \
You will need to use these as the context to suggest the user to interact \
with Pulse Editor and extension commands.`,
        },
        availableCommands: {
          type: [
            {
              cmdName: {
                type: "string",
                description:
                  "The name of the command that the user is trying to use from the extension.",
              },
              parameters: {
                type: [
                  {
                    name: {
                      type: "string",
                      description:
                        "The name of the parameter needed to run the command from the extension.",
                    },
                    type: {
                      type: "string",
                      description:
                        "The type of the parameter needed to run the command from the extension.",
                    },
                    description: {
                      type: "string",
                      description:
                        "The description of the parameter needed to run the command from the extension.",
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
        projectDirTree: {
          type: [
            {
              name: {
                type: "string",
                description: "File system object's name.",
              },
              uri: {
                type: "string",
                description: "File system object's uri.",
              },
              isFolder: {
                type: "boolean",
                description:
                  "Whether the file system object is a folder or not.",
              },
              subDirItems: {
                type: "any",
                description:
                  "The sub-directory items of the file system object. ",
                optional: true,
              },
            },
          ],
          description: "The project directory structure.",
        },
      },
      prompt: `\
For this task, you will suggest extension commands that fit the user's needs.
You are given the following information about the conversation and the available commands.
Do not assume the command knows what you know (e.g. background information about the user \
and Pulse Editor), you need to include these knowledge in command's arguments.

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
{activeTabView}
\`\`\`
Available commands:
\`\`\`
{commands}
\`\`\`
Project directory tree:
\`\`\`
{projectDirTree}
\`\`\`
`,
      returns: {
        language: {
          type: "string",
          description: "The language of user's message.",
        },
        suggestedCmd: {
          type: "string",
          description:
            "The command that you suggest the user to try for their needs.",
        },
        suggestedArgs: {
          type: [
            {
              name: {
                type: "string",
                description:
                  "The name of the argument needed to run the command from the extension.",
              },
              value: {
                type: "string",
                description:
                  "The value that you suggest for the user to run the command from the extension. Add any relevant additional knowledge if possible.",
              },
            },
          ],
          description: `The arguments that you suggested for user to run the command from the extension. \
This must match the command's parameters provided earlier.`,
        },
        suggestedViewId: {
          type: "string",
          description:
            "The ID of the view (usually a uuid) that you suggest the user to run the command on. \
Note, this is not the same as the module/extension ID (usually a named ID). In order to suggest a view ID, \
you must match the commands' module ID (named ID) with the opened views' extensionConfig.id (named ID). \
If a command and an opened view has the same extension/module ID (named ID), you can use that \
opened view's ID (uuid) as the suggested view ID.",
        },
        response: {
          type: "string",
          description: `The platform-level assistant agent's response to the user's input or question. \
Explain in a friendly way to the user that you will call the command for them, and explain the reasoning behind \
picking the command and values of the arguments. If a command is suggested, you will let the user know \
that you will execute this command for them and wait for the response to further analyze its effects. \
Keep your response short and concise but informative in 2-3 sentences unless the user wants a detailed \
explanation. This field needs to be in the same language as the user's message.`,
        },
      },
    },
    {
      access: AccessEnum.public,
      name: "suggestExtensions",
      parameters: {
        chatHistory: {
          type: "string",
          description: "The chat history between the user and you.",
        },
        userMessage: {
          type: "string",
          description: "The user's message.",
        },
        relevantExtensions: {
          type: {
            name: {
              type: "string",
              description: "The name of the extension",
            },
            description: {
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
          type: [
            {
              name: {
                type: "string",
                description: "The name of the extension",
              },
              description: {
                type: "string",
                description: "The description of the extension",
              },
            },
          ],
          description: `The extension suggestions.`,
        },
        response: {
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
          type: "string",
          description: "The user's message.",
        },
        suggestedCmd: {
          type: "string",
          description:
            "The command that you suggested earlier for the user to try for their needs.",
        },
        previousSuggestion: {
          type: "string",
          description:
            "The previous suggestion you made to the user before running the command.",
        },
        commandResult: {
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
        language: {
          type: "string",
          description: "The language of user's message.",
        },
        analysis: {
          type: "string",
          description:
            "The analysis of the command result and its relevance to the user's needs. \
Acknowledge command result to the user. \
Keep your response short and concise but informative in 2-3 sentences. Please do not \
make reflections about the command result, just report what it did. \
This field needs to be in the same language as the original user's message.",
        },
      },
    },
  ],
  LLMConfig: {
    provider: llmProviderOptions.openai.provider,
    modelName: "gpt-4o",
    temperature: 0.95,
  },
};
