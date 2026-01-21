import {
  Action,
  Agent,
  AppConfig,
  FileSystemObject,
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
  updateModalStates: Dispatch<SetStateAction<ModalStates | undefined>>;
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
  currentWorkspace?: WorkspaceConfig;
  workspaceContent?: FileSystemObject[];

  /* Auth */
  isSigningIn?: boolean;
  isRefreshSession?: boolean;

  menuActions?: MenuAction[];

  tabViews: TabView[];
  tabIndex: number;

  // Action viewer
  isCommandViewerOpen?: boolean;
  actions?: ScopedAction[];

  // Side menu panel
  isSideMenuOpen?: boolean;
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

  // Read-only
  workflowNodes: ReactFlowNode<AppNodeData>[];
  // Read-only
  workflowEdges: ReactFlowEdge[];
  // Update workflow callbacks
  updateWorkflowNodeData?: (
    nodeViewId: string,
    data: Partial<AppNodeData>,
  ) => void;
  canvasSize?: {
    width: number;
    height: number;
    x: number;
    y: number;
  };

  modalStates?: ModalStates;
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
export type ModalStates = {
  marketplace?: {
    isOpen?: boolean;
  };
  appInfo?: {
    isOpen?: boolean;
    content?: AppInfoModalContent;
  };
  openInProject?: {
    isOpen?: boolean;
    app?: ExtensionApp;
    isOpenAppInFullscreen?: boolean;
    workflow?: Workflow;
  };
  editorSettings?: {
    isOpen?: boolean;
  };
  workspaceSettings?: {
    isOpen?: boolean;
    initialWorkspace?: WorkspaceConfig;
    isShowUseButton?: boolean;
  };
  agentConfig?: {
    isOpen?: boolean;
  };
  login?: {
    isOpen?: boolean;
  };
  openSourceInfo?: {
    isOpen?: boolean;
  };
  password?: {
    isOpen?: boolean;
  };
  projectSettings?: {
    isOpen?: boolean;
    projectInfo?: ProjectInfo;
  };
  publishWorkflow?: {
    isOpen?: boolean;
    workflowCanvas?: HTMLElement | null;
    localNodes?: ReactFlowNode<AppNodeData>[];
    localEdges?: ReactFlowEdge[];
    entryPoint?: ReactFlowNode<AppNodeData> | undefined;
    saveAppsSnapshotStates?: () => Promise<{
      [key: string]: any;
    }>;
  };
  sharing?: {
    isOpen?: boolean;
  };
};

export type OpenFileDialogConfig = {
  isFolder?: boolean;
  isMultiple?: boolean;
};

export type SaveFileDialogConfig = {
  extension?: string;
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
  requiredVersion?: string;
  inviteCode?: string;
  // An app can be opened via a file.
  // e.g. a PDF viewer app can be opened with a PDF file;
  //      a game engine app can be opened with a game project file.
  fileUri?: string;
  initialHeight?: number;
  initialWidth?: number;
  initialIsFullscreen?: boolean;
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

/* App meta data returned from registry backend */
export type AppMetaData = {
  name: string;
  version: string;
  mfVersion?: string;
  appConfig?: AppConfig;
  author: {
    name: string;
  };
  org: {
    name: string;
  };
  visibility: "public" | "private" | "unlisted";
};
// #endregion

// #region Workflow
export type Workflow = {
  name: string;
  version: string;
  content: WorkflowContent;
  thumbnail?: string;
  visibility: "private" | "public" | "unlisted";
  requireWorkspace: boolean;
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
  isFullscreen: boolean;
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

export type NodeShape = {
  width?: number;
  height?: number;
};

export type NodeLocation = {
  x?: number;
  y?: number;
  zoom: number;
  zIndex?: number;
};

export type NodeShapeAndLocation = NodeShape & NodeLocation;
// #endregion

// #region Action
export type ScopedAction = {
  viewId?: string;
  type: "editor" | "app";
  action: Action;
};
// #endregion

// #region Pulse Editor Cloud

export type CreditBalance = {
  balance: number;
};

export type SubscriptionPlan = {
  name: string;
  description: string;
  price: number;
  interval: string;
  maxWorkspaces: number;
  monthlyCredits: number;
  maxWorkspaceSpecs: string | null;
  maxWorkspaceStorageGB: number | null;
  maxAIModelName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlanUsage = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  remainingWorkspaceCount: number;
  remainingCredit: number;
};
// #endregion

// #region Platform AI Assistant
export type EditorChatMessage = {
  role: "user" | "assistant";
  message: UserMessage | EditorAssistantMessage;
  isPlan?: boolean;
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
export type EditorAssistantMessage = {
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
  chatHistory: EditorChatMessage[];
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
export type WorkspaceConfig = {
  id: string;
  name: string;
  cpuLimit: string;
  memoryLimit: string;
  volumeSize: string;
  createdAt?: Date;
  isDeleted?: boolean;
  status?: "running" | "paused";
};

export type SpecOption = {
  key: string;
  vCPU: number;
  ram: number;
};

// #endregion
