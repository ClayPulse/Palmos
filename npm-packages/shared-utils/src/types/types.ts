// #region Inter-Module Communication
/* Inter Module Communication messages */
export enum IMCMessageTypeEnum {
  // #region AI modality tools
  ModalityVAD = "modality-vad",
  ModalitySTT = "modality-stt",
  ModalityLLM = "modality-llm",
  ModalityTTS = "modality-tts",
  ModalitySpeech2Speech = "modality-speech-to-speech",
  // TODO: Do not use UseX2Y or Use__Gen in the future.
  // Instead, use a common AI IO adapter.
  ModalityImageGen = "modality-image-gen",
  ModalityVideoGen = "modality-video-gen",
  ModalityOCR = "modality-ocr",
  ModalityMusicGen = "modality-music-gen",
  // #endregion

  // #region Extension states
  // Notify Pulse that extension window is available
  ExtReady = "ext-ready",
  // Notify Pulse that extension is closing
  ExtClose = "ext-close",
  // #endregion

  // #region Editor states
  // Notify editor that extension is loading or loaded
  EditorLoadingExt = "editor-loading-ext",
  /* Extension commands*/
  EditorRunExtCommand = "editor-run-ext-command",
  // Execute agent method
  EditorRunAgentMethod = "editor-run-agent-method",
  // Get theme
  EditorThemeUpdate = "editor-theme-update",
  // Send notification
  EditorShowNotification = "editor-show-notification",
  // #endregion

  // #region Platform API interaction messages (require OS-like environment)
  /* Terminal */
  PlatformCreateTerminal = "platform-create-terminal",
  // Update view file
  PlatformWriteFile = "platform-write-file",
  // Request view file
  PlatformReadFile = "platform-read-file",
  // #endregion

  // #region Signal messages
  SignalGetWindowId = "signal-get-window-id",
  SignalReturnWindowId = "signal-return-window-id",
  // A message to notify sender that the message
  // has been received and finished processing
  SignalAcknowledge = "signal-acknowledge",
  // Notify abort
  SignalAbort = "signal-abort",
  // Error
  SignalError = "signal-error",
  // #endregion
}

export type IMCMessage = {
  id: string;
  from: string;
  type: IMCMessageTypeEnum;
  payload?: any;
};

export type ReceiverHandler = (
  senderWindow: Window,
  message: IMCMessage,
  abortSignal?: AbortSignal
) => Promise<any>;

// IMC receiver handler map
export type ReceiverHandlerMap = Map<IMCMessageTypeEnum, ReceiverHandler>;
// #endregion

/* File view */
export type TextFileSelection = {
  lineStart: number;
  lineEnd: number;
  text: string;
};

export type ViewModel = {
  viewId: string;
  isFocused: boolean;
  // The file content and path.
  // Optional, if the view is not a file view.
  file?: {
    content: string;
    path: string;
    selections?: TextFileSelection[];
  };
  extensionConfig?: ExtensionConfig;
};

/* Fetch API */
export type FetchPayload = {
  uri: string;
  options?: RequestInit;
};

/* Notification */
export enum NotificationTypeEnum {
  Success = "success",
  Error = "error",
  Info = "info",
  Warning = "warning",
}

// #region Extension settings
export enum ExtensionTypeEnum {
  Generic = "generic",
  FileView = "file-view",
  ConsoleView = "console-view",
}

export type ExtensionConfig = {
  id: string;
  version: string;
  author?: string;
  displayName?: string;
  description?: string;
  materialIcon?: string;
  extensionType?: ExtensionTypeEnum;
  fileTypes?: string[];
  preview?: string;
  enabledPlatforms?: Record<string, boolean>;

  // Extension or user installed agents
  agents?: Agent[];
  // Exposed commands in the extension
  commandsInfoList?: ExtensionCommandInfo[];
  // Visibility
  visibility: string;
};

export type ExtensionCommandInfo = {
  name: string;
  description: string;
  parameters: Record<string, TypedVariable>;
};

export type ExtensionCommand = {
  info: ExtensionCommandInfo;
  handler: (args: any) => Promise<any>;
};
// #endregion

// #region Agent config
export type Agent = {
  name: string;
  version: string;
  systemPrompt: string;
  availableMethods: AgentMethod[];
  description: string;
  tools?: AgentTool[];
  LLMConfig?: LLMConfig;
};

/**
 * An agent method is a sub task that an agent can perform.
 */
export type AgentMethod = {
  access: AccessEnum;
  name: string;
  parameters: Record<string, TypedVariable>;
  prompt: string;
  returns: Record<string, TypedVariable>;
  // If this config does not exist, use the class's LLMConfig
  LLMConfig?: LLMConfig;
};

export type TypedVariable = {
  type: TypedVariableType;
  name: string;
  // Describe the variable for LLM to better understand it
  description: string;
  optional?: boolean;
  defaultValue?: any;
};

/**
 * A tool that agent can use during method execution.
 *
 *
 * The tool may optionally return a value to the agent.
 */
export type AgentTool = {
  access: AccessEnum;
  name: string;
  description: string;
  parameters: Record<string, TypedVariable>;
  returns: Record<string, TypedVariable>;
};
// #endregion

export type TypedVariableType =
  | "string"
  | "number"
  | "boolean"
  | "any"
  | TypedVariableObjectType
  | TypedVariableArrayType;

export type TypedVariableObjectType = {
  [key: string]: TypedVariable;
};

export type TypedVariableArrayType = [TypedVariableType];

export function isArrayType(
  value: TypedVariableType
): value is TypedVariableArrayType {
  return Array.isArray(value) && value.length === 1;
}

export function isObjectType(
  value: TypedVariableType
): value is TypedVariableObjectType {
  return typeof value === "object" && !Array.isArray(value);
}

export enum AccessEnum {
  public = "public",
  private = "private",
}

// #region AI settings
export type STTConfig = {
  provider: string;
  modelName: string;
};

export type LLMConfig = {
  provider: string;
  modelName: string;
  temperature: number;
};

export type TTSConfig = {
  provider: string;
  modelName: string;
  voice: string;
};

export type ImageModelConfig = {
  provider: string;
  modelName: string;
};

export type VideoModelConfig = {
  provider: string;
  modelName: string;
};
// #endregion

// TODO: In the future, add a common AI IO adapter
// where the input and output types are arbitrary
// modalities. So we can plug in any AI model,
// or even a program, for either input or output.
// e.g. similar to how a function works.
// export type FuncAdapter = {
// input:
// output:
// }
