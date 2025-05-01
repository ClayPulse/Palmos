import { Dispatch, RefObject, SetStateAction } from "react";
import { AIModelConfig } from "./ai-model-config";
import {
  Agent,
  ExtensionConfig,
  FileViewModel,
} from "@pulse-editor/shared-utils";

// #region Context
export type EditorStates = {
  // Selection by drawing
  isDrawing: boolean;
  isDrawHulls: boolean;
  isDownloadClip: boolean;

  // Inline/popover chat
  isInlineChatEnabled: boolean;

  // Open chat view
  isChatViewOpen: boolean;

  // Voice agent
  isRecording: boolean;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  isMuted: boolean;

  // Toolbar
  isToolbarOpen: boolean;

  project?: string;
  projectContent?: FileSystemObject[];
  projectsInfo?: ProjectInfo[];

  explorerSelectedNodeRefs: RefObject<TreeViewNodeRef | null>[];

  pressedKeys: string[];

  // Password to access the credentials
  password?: string;

  openedViewModels: FileViewModel[];

  // Keep track of unique ids of each view
  // to make sure that the view is not duplicated
  // and not interfered with each other
  viewIds: string[];
};

export type PersistentSettings = {
  sttProvider?: string;
  llmProvider?: string;
  ttsProvider?: string;

  sttModel?: string;
  llmModel?: string;
  ttsModel?: string;

  sttAPIKey?: string;
  llmAPIKey?: string;
  ttsAPIKey?: string;

  isUsePassword?: boolean;
  isPasswordSet?: boolean;
  ttl?: number;

  ttsVoice?: string;

  projectHomePath?: string;

  extensions?: Extension[];
  defaultFileTypeExtensionMap?: { [key: string]: Extension };
  isExtensionDevMode?: boolean;

  installedAgents?: InstalledAgent[];

  apiKeys?: {
    [key: string]: string;
  };

  mobileHost?: string;
};
// #endregion

export type CodeCompletionInstruction = {
  text?: string;
  audio?: Blob;
};

export type CodeCompletionResult = {
  text: {
    codeCompletion: string;
    explanation: string;
  };
  audio?: Blob;
};

export type InlineSuggestionResult = {
  snippets: string[];
};

export type LineChange = {
  // Index starts from 1
  index: number;
  content: string;
  status: "added" | "deleted" | "modified";
};

export type ChatMessage = {
  from: string;
  content: string;
  datetime: string;
};

export type EditorContextType = {
  editorStates: EditorStates;
  setEditorStates: Dispatch<SetStateAction<EditorStates>>;
  persistSettings: PersistentSettings | undefined;
  setPersistSettings: Dispatch<SetStateAction<PersistentSettings | undefined>>;
  aiModelConfig: AIModelConfig;
};

/* File system */
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

export type Extension = {
  config: ExtensionConfig;
  isEnabled: boolean;
  remoteOrigin: string;
};

export type InstalledAgent = Agent & {
  author: {
    type: "user" | "extension";
    // Individual user or the author of a 3rd party extension
    publisher: string;
    // 3rd party extension name
    extension?: string;
  };
};

export type LLMUsage = {
  provider: string;
  usedModals: string[];
  usedByAgents: string[];
  totalUsageByAgents: number;
};

export enum PlatformEnum {
  Capacitor = "capacitor",
  Electron = "electron",
  VSCode = "vscode",
  Web = "web",
}
