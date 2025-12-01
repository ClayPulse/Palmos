import {
  Action,
  Agent,
  AppConfig,
  ModelConfig,
  PolyIMC,
  TTSModelConfig,
  TypedVariableType,
  ViewModeEnum,
  ViewModel,
} from "@pulse-editor/shared-utils";
import { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";
import { Dispatch, RefObject, SetStateAction } from "react";
import { SideMenuTabEnum } from "./enums";
import { BaseLLM } from "./modalities/llm/base-llm";
import { BaseSTT } from "./modalities/stt/base-stt";
import { BaseTTS } from "./modalities/tts/base-tts";

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

  /* Toolbar */
  isToolbarOpen: boolean;

  project?: string;
  projectsInfo?: ProjectInfo[];

  explorerSelectedNodeRefs: RefObject<TreeViewNodeRef | null>[];

  pressedKeys: string[];

  /* Password to access the credentials */
  password?: string;

  aiModels?: AIModels;

  // The currently selected workspace
  currentWorkspace?: RemoteWorkspace;
  workspaceContent?: FileSystemObject[];

  /* Auth */
  isSigningIn?: boolean;
  isRefreshSession?: boolean;

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
  sideMenuTab?: SideMenuTabEnum;

  // Selected views
  selectedViewIds?: string[];

  // Drag control
  isDraggingOverCanvas?: boolean;
  dropMessage?: string;

  inputDeviceBuffers?: {
    audioBuffer?: ArrayBuffer;
  };

  outputDeviceBuffers?: {
    audioBuffer?: ArrayBuffer;
  };
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

  assistantChatModelConfig?: {
    stt?: ModelConfig;
    llm?: ModelConfig;
    tts?: TTSModelConfig;
    sts?: TTSModelConfig;
  };
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
  id: string;
  name: string;
  version: string;
  // Markdown content
  readme?: string;
  url?: string;
  author?: string;
  license?: string;
};

export type MenuAction = {
  id?: string;
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
  // App configurations.
  // This does not change once the canvas view is created.
  appConfigs?: AppViewConfig[];
  initialWorkflowContent?: WorkflowContent;
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
  models: {
    name: string;
    description: string;
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
  hasChannel: (viewId: string) => boolean;
  removeViewChannels: (viewId: string) => void;
};

// #endregion

// #region Pulse Editor Cloud
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
  author: {
    name: string;
  };
  org: {
    name: string;
  };
  visibility: "public" | "private" | "unlisted";
  thumbnail?: string;
};
// #endregion

// #region Workflow
export type Workflow = {
  name: string;
  version: string;
  content: WorkflowContent;
  thumbnail?: string;
  visibility: "private" | "public" | "unlisted";
};

export type WorkflowContent = {
  nodes: ReactFlowNode<AppNodeData>[];
  edges: ReactFlowEdge[];
  defaultEntryPoint?: ReactFlowNode<AppNodeData>;
  snapshotStates?: { [key: string]: any };
};

export type AppNodeData = {
  config: AppViewConfig;
  selectedAction: Action | undefined;
  isRunning: boolean;
  isShowingWorkflowConnector: boolean;
  ownedAppViews: {
    [key: string]: ViewModel;
  };
};

export type FileDragData = {
  uri: string;
};

export type AppDragData = {
  app: ExtensionApp;
};

export type DragData = {
  type: "file" | "app";
  data: FileDragData | AppDragData;
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

/**
 *  User themselves can only either talk or chat. But user may attach
 *  additional content.
 */
export type UserMessage = {
  content: {
    text?: string;
    audio?: ArrayBuffer;
  };
  attachments: Attachment[];
};

/**
 *  Assistant's response can be in multiple modalities.
 */
export type PlatformAssistantMessage = {
  content: {
    text?: string;
    audio?: ArrayBuffer;
  };
  attachments: Attachment[];
};

export type Attachment = {
  type: "file" | "image" | "video" | "audio" | "other";
  uri: string;
  name?: string;
};

export type AssistantEditorContextArgs = {
  chatHistory: PlatformAssistantMessage[];
  activeTabView: string;
  availableCommands: {
    cmdName: string;
    parameters: {
      name: string;
      type: TypedVariableType;
      description: string;
    }[];
  }[];
  projectDirTree: any[];
};

// #endregion

// #region Project

export type ProjectInfo = {
  name: string;
  ctime?: Date;
};

export type ProjectAsset = {
  name: string;
  type: "file" | "workflow";
  // URI to download from remote or load from local
  uri: string;
};
// #endregion

// #region Workspace
export type RemoteWorkspace = {
  id: string;
  name: string;
  cpuLimit: string;
  memoryLimit: string;
  volumeSize: string;
  createdAt?: Date;
};

// #endregion
