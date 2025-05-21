// #region Inter-Module Communication
/* Inter Module Communication messages */
export enum IMCMessageTypeEnum {
  GetWindowId = "get-window-id",
  ReturnWindowId = "return-window-id",

  // Update view file
  WriteViewFile = "write-view-file",
  // Request view file
  RequestViewFile = "request-view-file",

  // Network fetch request
  Fetch = "fetch",
  // Send notification
  Notification = "notification",
  // Get theme
  ThemeChange = "theme-change",

  /* Agents */
  // Execute agent method
  RunAgentMethod = "run-agent-method",

  /* Modality tools */
  UseVAD = "use-vad",
  UseSTT = "use-stt",
  UseLLM = "use-llm",
  UseTTS = "use-tts",
  UseDiffusion = "use-diffusion",
  UseOCR = "use-ocr",
  UseSpeech2Speech = "use-speech2speech",

  /* Extension commands*/
  RunExtCommand = "run-ext-command",

  /* Terminal */
  RequestTerminal = "request-terminal",

  /* Extension statuses */
  // Notify Pulse that extension window is available
  ExtReady = "ext-ready",
  // Notify Pulse that extension is closing
  ExtClose = "ext-close",

  // Notify Pulse that extension has finished loading
  Loaded = "loaded",
  // A message to notify sender that the message
  // has been received and finished processing
  Acknowledge = "acknowledge",
  // Notify abort
  Abort = "abort",
  // Error
  Error = "error",
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

/* Extension settings */
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
};

// #region Agent config
export type Agent = {
  name: string;
  version: string;
  systemPrompt: string;
  availableMethods: AgentMethod[];
  LLMConfig: LLMConfig;
  description: string;
  tools?: AgentTool[];
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

/* AI settings */
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

export type ExtensionCommandInfo = {
  name: string;
  description: string;
  parameters: Record<string, TypedVariable>;
};

export type ExtensionCommand = {
  info: ExtensionCommandInfo;
  handler: (args: any) => Promise<any>;
};
