import { Dispatch, RefObject, SetStateAction } from "react";
import {
  Agent,
  ExtensionCommandInfo,
  ExtensionConfig,
  PolyIMC,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { BaseSTT } from "./stt/stt";
import { BaseLLM } from "./llm/llm";
import { BaseTTS } from "./tts/tts";

// #region Editor Context
export type EditorContextType = {
  editorStates: EditorStates;
  setEditorStates: Dispatch<SetStateAction<EditorStates>>;
  persistSettings: PersistentSettings | undefined;
  setPersistSettings: Dispatch<SetStateAction<PersistentSettings | undefined>>;
};

export type EditorStates = {
  /* Selection by drawing */
  isDrawing: boolean;
  isDrawHulls: boolean;
  isDownloadClip: boolean;

  /* Inline/popover chat */
  isInlineChatEnabled: boolean;

  /* Open chat view */
  isChatViewOpen: boolean;

  /* Voice agent */
  isLoadingRecorder: boolean;
  // Is the recorder on.
  // The recorder might be on while the agent is thinking or speaking
  isRecording: boolean;
  // Is the agent listening to the user input
  isListening: boolean;
  // Is the agent thinking (processing the user input)
  isThinking: boolean;
  thinkingText?: string;
  // Is the agent speaking (reading the output)
  isSpeaking: boolean;
  // Audio input stream
  // This is consumed when recording is processed
  inputAudioStream: ArrayBuffer | undefined;
  // // Audio output stream
  // // This is consumed when audio is played
  // outputAudioStream: ReadableStream<Uint8Array> | undefined;

  /* Toolbar */
  isToolbarOpen: boolean;

  project?: string;
  projectContent?: FileSystemObject[];
  projectsInfo?: ProjectInfo[];

  explorerSelectedNodeRefs: RefObject<TreeViewNodeRef | null>[];

  pressedKeys: string[];

  /* Password to access the credentials */
  password?: string;

  openedViewModels: ViewModel[];

  // Keep track of unique ids of each view
  // to make sure that the view is not duplicated
  // and not interfered with each other
  viewIds: string[];

  aiModels?: AIModels;
};

export type PersistentSettings = {
  sttProvider?: string;
  llmProvider?: string;
  ttsProvider?: string;

  sttModel?: string;
  llmModel?: string;
  ttsModel?: string;

  isUsePassword?: boolean;
  isPasswordSet?: boolean;
  ttl?: number;

  ttsVoice?: string;

  projectHomePath?: string;

  extensions?: Extension[];
  defaultFileTypeExtensionMap?: { [key: string]: Extension };
  isExtensionDevMode?: boolean;

  extensionAgents?: ExtensionAgent[];
  extensionCommands?: PEExtensionCommandInfo[];

  userAgents?: UserAgent[];

  apiKeys?: {
    [key: string]: string;
  };

  mobileHost?: string;
};
// #endregion

// #region Interface
export type OpenFileDialogConfig = {
  isFolder?: boolean;
  isMultiple?: boolean;
};

export type SaveFileDialogConfig = {
  extension?: string;
};

export type FileSystemObject = {
  name: string;
  uri: string;
  isFolder: boolean;
  subDirItems?: FileSystemObject[];
};

export type ProjectInfo = {
  name: string;
  ctime: Date;
};

export type TreeViewGroupRef = {
  startCreatingNewFolder: () => void;
  startCreatingNewFile: () => void;
  cancelCreating: () => void;
  getFolderUri: () => string;
};

export type TreeViewNodeRef = {
  getParentGroupRef: () => TreeViewGroupRef | null;
  getChildGroupRef: () => TreeViewGroupRef | null;
  isFolder: () => boolean;
};

export type ContextMenuState = {
  x: number;
  y: number;
  isOpen: boolean;
};

export type ListPathOptions = {
  include: "folders" | "files" | "all";
  isRecursive: boolean;
};

export type TabItem = {
  name: string;
  icon?: string;
  description: string;
};
// #endregion

// #region AI
export type AIModels = {
  // --- Speech-to-Text ---
  sttModel?: BaseSTT;
  // --- Language Model ---
  llmModel?: BaseLLM;
  // --- Text-to-Speech ---
  ttsModel?: BaseTTS;
};

export type ExtensionAgent = Agent & {
  author: {
    // Individual user or the author of a 3rd party extension
    publisher: string;
    // 3rd party extension name
    extension?: string;
  };
};

export type UserAgent = Agent & {
  author: {
    publisher: string;
  };
};

export type LLMUsage = {
  provider: string;
  usedModals: string[];
  usedByAgents: string[];
  totalUsageByAgents: number;
};

export type ChatMessage = {
  from: string;
  content: string;
  datetime: string;
};
// #endregion

// #region Cross platform API
export enum PlatformEnum {
  Capacitor = "capacitor",
  Electron = "electron",
  VSCode = "vscode",
  Web = "web",
}
// #endregion

// #region Extension
export type Extension = {
  config: ExtensionConfig;
  isEnabled: boolean;
  remoteOrigin: string;
};

export type PEExtensionCommandInfo = ExtensionCommandInfo & {
  moduleId: string;
};
// #endregion

// #region IMC Context
export type IMCContextType = {
  polyIMC: PolyIMC | undefined;
};

// #endregion
