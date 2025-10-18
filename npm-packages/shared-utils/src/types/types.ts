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

  // #region App states
  // Notify Pulse that app window is available
  AppReady = "app-ready",
  // Notify Pulse that aoo is closing
  AppClose = "app-close",
  // #endregion

  // #region Editor states
  // Notify editor that app is loading or loaded
  EditorLoadingApp = "editor-loading-app",
  // App actions
  EditorRegisterAction = "editor-register-action",
  EditorRunAppAction = "editor-run-app-action",
  // Execute agent method
  EditorRunAgentMethod = "editor-run-agent-method",
  // Get theme
  EditorThemeUpdate = "editor-theme-update",
  EditorAppRequestTheme = "editor-app-request-theme",
  // Send notification
  EditorShowNotification = "editor-show-notification",
  // Get environment variables
  EditorGetEnv = "editor-get-env",
  // App state snapshot upon importing & exporting
  EditorAppStateSnapshotRestore = "editor-app-state-snapshot-restore",
  EditorAppStateSnapshotSave = "editor-app-state-snapshot-save",
  // Handle editor file selection or drop
  EditorAppReceiveFileUri = "editor-app-receive-file-uri",
  // App uses owned app
  EditorAppUseOwnedApp = "editor-app-use-owned-app",
  // #endregion

  // #region Platform API interaction messages (require OS-like environment)
  /* Terminal */
  PlatformCreateTerminal = "platform-create-terminal",
  // Update view file
  PlatformWriteFile = "platform-write-file",
  // Request view file
  PlatformReadFile = "platform-read-file",
  // File update (file watch notification from platform to view)
  PlatformFileUpdate = "platform-file-update",
  // #endregion

  // #region Signal messages
  SignalRequestOtherWindowId = "signal-request-other-window-id",
  // A message to notify sender that the message
  // has been received and finished processing
  SignalAcknowledge = "signal-acknowledge",
  // Notify abort
  SignalAbort = "signal-abort",
  // Error
  SignalError = "signal-error",
  // Ignore
  SignalIgnore = "signal-ignore",
  // #endregion
}

export type IMCMessage = {
  messageId: string;
  channelId?: string;
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
  appConfig?: AppConfig;
};

export enum ViewModeEnum {
  App = "app",
  Canvas = "canvas",
  Home = "home",
}

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

// #region App settings
export enum AppTypeEnum {
  Generic = "generic",
  FileView = "file-view",
  ConsoleView = "console-view",
}

export type AppConfig = {
  id: string;
  version: string;
  libVersion?: string;
  visibility?: "public" | "private" | "unlisted";
  author?: string;
  displayName?: string;
  description?: string;
  materialIcon?: string;
  appType?: AppTypeEnum;
  fileTypes?: string[];
  thumbnail?: string;
  enabledPlatforms?: Record<string, boolean>;

  // App installed agents
  agents?: Agent[];
  // Exposed actions in the modular app
  preRegisteredActions?: Action[];
  // Recommended dimensions for app view in canvas
  recommendedHeight?: number;
  recommendedWidth?: number;
};

export type Action = {
  name: string;
  description: string;
  parameters: Record<string, TypedVariable>;
  returns: Record<string, TypedVariable>;
  handler?: (args: any) => Promise<any>;
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
  // An app instance is a reference to another app.
  // This instance could be possessed by the owner,
  // or it can be initialized by the caller.
  | "app-instance"
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
