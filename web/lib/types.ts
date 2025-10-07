import {
  Action,
  Agent,
  AppConfig,
  PolyIMC,
  ViewModeEnum,
} from "@pulse-editor/shared-utils";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { Dispatch, RefObject, SetStateAction } from "react";
import { BaseLLM } from "./modalities/llm/llm";
import { BaseSTT } from "./modalities/stt/stt";
import { BaseTTS } from "./modalities/tts/tts";

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
  isConsolePanelOpen: boolean;

  /* Voice agent */
  isLoadingRecorder: boolean;
  // Is the recorder on.
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
  inputAudioStream: ReadableStream | undefined;
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

  aiModels?: AIModels;

  // The currently selected workspace
  currentWorkspace?: RemoteWorkspace;

  isSigningIn?: boolean;

  /* Modals */
  isAppInfoModalOpen?: boolean;
  appInfoModalContent?: AppInfoModalContent;

  menuActions?: MenuAction[];

  tabViews: TabView[];
  tabIndex: number;

  // Action viewer
  isCommandViewerOpen?: boolean;
  actions?: ScopedAction[];

  // Side menu panel
  isSideMenuOpen?: boolean;
  isMarketplaceOpen?: boolean;
};

/**
 *  Persistent Settings of Editor.
 *  These fields need to be serializable to be stored
 *  in local storage or managed cloud storage.
 */
export type PersistentSettings = {
  sttProvider?: string;
  sttModel?: string;

  llmProvider?: string;
  llmModel?: string;

  ttsProvider?: string;
  ttsModel?: string;
  ttsVoice?: string;

  imageGenProvider?: string;
  imageGenModel?: string;

  videoGenProvider?: string;
  videoGenModel?: string;

  isUsePassword?: boolean;
  isPasswordSet?: boolean;
  ttl?: number;

  projectHomePath?: string;

  // Note: right now extension == app -- this might change in the future for more clarity
  extensions?: ExtensionApp[];
  defaultFileTypeExtensionMap?: { [key: string]: ExtensionApp };
  isExtensionDevMode?: boolean;

  extensionAgents?: ExtensionAgent[];

  userAgents?: UserAgent[];

  apiKeys?: {
    [key: string]: string;
  };

  mobileHost?: string;

  isUseManagedCloud?: boolean;

  // Environment variables
  envs?: Record<string, string>;
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
  ctime?: Date;
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
  isRecursive?: boolean;
  gitignore?: string[];
};

export type TabItem = {
  name: string;
  icon?: string;
  description: string;
};

export type AppInfoModalContent = {
  name: string;
  version: string;
  // Markdown content
  readme?: string;
  url?: string;
  author?: string;
  license?: string;
};

export type MenuAction = {
  name: string;
  menuCategory: "file" | "edit" | "view";
  description?: string;
  shortcut?: string;
  actionFunc: () => Promise<void>;
  icon?: string;
};

export type AppViewConfig = {
  viewId: string;
  app: string;
  inviteCode?: string;
  // An app can be opened via a file.
  // e.g. a PDF viewer app can be opened with a PDF file;
  //      a game engine app can be opened with a game project file.
  fileUri?: string;
  recommendedHeight?: number;
  recommendedWidth?: number;
};

export type CanvasViewConfig = {
  viewId: string;
  workflow?: Workflow;
  nodes?: AppViewConfig[];
};

export type TabView = {
  type: ViewModeEnum;
  config: AppViewConfig | CanvasViewConfig;
};

// #endregion

// #region AI Settings
export type AIModels = {
  // --- Speech-to-Text ---
  sttModel?: BaseSTT;
  // --- Language Model ---
  llmModel?: BaseLLM;
  // --- Text-to-Speech ---
  ttsModel?: BaseTTS;
};

export type AIProviderOption = {
  provider: string;
  isSupported: boolean;
  models: {
    model: string;
    // TODO: do not enforce supported models in the future
    // and allow users to enter any model from the provider.
    // Available models should be displayed in a dropdown
    // as suggestions.
    isSupported: boolean;
  }[];
};
// #endregion

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

// #region Extension apps
export type ExtensionApp = {
  config: AppConfig;
  isEnabled: boolean;
  remoteOrigin: string;
  mfVersion?: string;
};

// #endregion

// #region IMC Context
export type IMCContextType = {
  polyIMC: PolyIMC | undefined;
  resolveWhenViewInitialized: (viewId: string) => Promise<void>;
  markIMCInitialized: (viewId: string) => void;
  resolveWhenActionRegistered: (action: Action) => Promise<void>;
};

// #endregion

// #region Pulse Editor Cloud
export type RemoteWorkspace = {
  id: string;
  name: string;
  address: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Session = {
  user: {
    name: string;
    email: string;
    image: string;
  };
  expires: string;
};

export type AppMetaData = {
  name: string;
  version: string;
  libVersion?: string;
  mfVersion?: string;
  description?: string;
  displayName?: string;
  user: {
    name: string;
  };
  org: {
    name: string;
  };
  visibility: string;
  thumbnail?: string;
};
// #endregion

// #region Workflow
export type Workflow = {
  nodes: ReactFlowNode<AppNodeData>[];
  edges: ReactFlowEdge[];
  defaultEntryPoint?: ReactFlowNode<AppNodeData>;
};

export type AppNodeData = {
  config: AppViewConfig;
  selectedAction: Action | undefined;
  setSelectedAction: (action: Action | undefined) => Promise<void>;
  isRunning: boolean;
};

// #endregion

// #region Action
export type ScopedAction = {
  viewId?: string;
  type: "editor" | "app";
  action: Action;
};
// #endregion

// #region Pulse Editor Cloud
export type Subscription = {
  plan: string;
  status: string;
  current_period_end: number;
};

export type CreditBalance = {
  balance: number;
};
// #endregion

// #region Platform AI Assistant
export type PlatformAssistantHistory = {
  role: "user" | "assistant";
  message: UserMessage | PlatformAssistantMessage;
};

export type UserMessage = {
  content: {
    text?: string;
    audio?: ReadableStream | undefined;
  };
  meta?: any;
};

export type PlatformAssistantMessage = {
  content: {
    text?: string;
    audio?: ReadableStream | undefined;
  };
  // Other data used to interact with the platform
  meta?: any;
};

// #endregion
