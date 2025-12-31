"use client";

import { LLMUsage, TabItem, UserAgent } from "@/lib/types";
import { Button, Divider, Input, Textarea } from "@heroui/react";
import { AgentMethod } from "@pulse-editor/shared-utils";
import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Icon from "../misc/icon";
import PasswordInput from "../misc/password-input";
import Tabs from "../misc/tabs";
import { EditorContext } from "../providers/editor-context-provider";
import ModalWrapper from "./wrapper";

export default function AgentConfigModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const editorContext = useContext(EditorContext);

  const tabItems: TabItem[] = [
    {
      name: "Agents",
      description: "Manage installed agents",
    },
    {
      name: "Providers",
      description: "Manage AI providers",
    },
  ];
  const [selectedTab, setSelectedTab] = useState<TabItem | undefined>(
    tabItems[0],
  );

  const [isCreatingNewAgent, setIsCreatingNewAgent] = useState(false);

  function getLLMUsageByAgents() {
    const agents = editorContext?.persistSettings?.extensionAgents ?? [];

    const usageList: LLMUsage[] = [];

    for (const agent of agents) {
      // const provider = agent.LLMConfig?.provider ?? "default";
      // const modelName = agent.LLMConfig?.modelName ?? "default";
      const [provider, modelName] = agent.LLMConfig?.modelId.split("/") ?? [
        "default",
        "default",
      ];

      const existing = usageList.find((u) => u.provider === provider);

      if (existing) {
        if (!existing.usedModals.includes(modelName)) {
          existing.usedModals.push(modelName);
        }
        existing.usedByAgents.push(agent.name);
        existing.totalUsageByAgents += 1;
      } else {
        usageList.push({
          provider,
          usedModals: [modelName],
          usedByAgents: [agent.name],
          totalUsageByAgents: 1,
        });
      }
    }

    return usageList;
  }

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Agents Configuration"
      isShowGoBack={isCreatingNewAgent}
      goBackCallback={() => {
        setIsCreatingNewAgent(false);
      }}
    >
      <div className="flex justify-center pb-1">
        <div className="bg-content2 rounded-md py-2">
          <Tabs
            tabItems={tabItems}
            selectedItem={selectedTab}
            setSelectedItem={setSelectedTab}
          />
        </div>
      </div>

      {selectedTab?.name === tabItems[0].name &&
        (isCreatingNewAgent ? (
          <AgentCreation setIsCreatingNewAgent={setIsCreatingNewAgent} />
        ) : (
          <AgentConfigs setIsCreatingNewAgent={setIsCreatingNewAgent} />
        ))}
      {selectedTab?.name === tabItems[1].name && (
        <ProviderConfigs llmUsageList={getLLMUsageByAgents()} />
      )}
    </ModalWrapper>
  );
}

function AgentConfigs({
  setIsCreatingNewAgent,
}: {
  setIsCreatingNewAgent: (isCreatingNewAgent: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);
  return (
    <div className="flex flex-col space-y-2">
      {editorContext?.persistSettings?.extensionAgents?.map((agent) => (
        <div
          key={agent.name}
          className="grid w-full grid-cols-[32px_auto_max-content] gap-x-2 p-1"
        >
          <div className="flex h-8 w-8 items-center justify-center">
            <Icon
              name="smart_toy"
              className="text-[28px]!"
              variant="outlined"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex gap-x-2">
              <p className="leading-5 font-semibold">{agent.name}</p>
              <p className="text-small text-foreground-600 leading-5">
                {agent.version}
              </p>
            </div>
            {
              <p className="text-small text-foreground-600 leading-4">
                Installed by extension {agent.author.extension} from{" "}
                {agent.author.publisher}
              </p>
            }
            <p className="pt-2 leading-4">{agent.description}</p>
            <div className="flex gap-x-1 pt-2">
              <p>LLM config:</p>
              <p>{agent.LLMConfig?.modelId ?? "default/default"}</p>
            </div>
            <div className="flex w-full justify-end gap-1">
              <Button size="sm">Edit</Button>
              <Button
                size="sm"
                color="danger"
                onPress={() => {
                  // Remove the agent with name
                  const updatedAgents =
                    editorContext?.persistSettings?.extensionAgents?.filter(
                      (a) => a.name !== agent.name,
                    );

                  editorContext?.setPersistSettings((prev) => {
                    return {
                      ...prev,
                      extensionAgents: updatedAgents,
                    };
                  });
                  toast.success("Deleted agent");
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button
        onPress={() => {
          setIsCreatingNewAgent(true);
        }}
      >
        Create New Agent
      </Button>
    </div>
  );
}

function AgentCreation({
  setIsCreatingNewAgent,
}: {
  setIsCreatingNewAgent: (isCreatingNewAgent: boolean) => void;
}) {
  const editorContext = useContext(EditorContext);

  const [name, setName] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [methods, setMethods] = useState<AgentMethod[]>([]);
  const [provider, setProvider] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");
  const [temperature, setTemperature] = useState<number>(0.5);

  return (
    <div className="flex flex-col space-y-2">
      <p>Add a basic chat agent to the editor.</p>

      <Input
        label="Name"
        placeholder="Enter agent name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Version"
        placeholder="Enter agent version"
        value={version}
        onChange={(e) => setVersion(e.target.value)}
      />
      <Textarea
        label="Description"
        placeholder="Enter agent description"
        isMultiline
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Textarea
        label="System Prompt"
        placeholder="Enter agent prompt"
        isMultiline
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Provider"
          placeholder="Enter provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        />
        <Input
          label="Model Name"
          placeholder="Enter model name"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
        />
        <Input
          label="Temperature"
          placeholder="Enter temperature"
          type="number"
          value={temperature.toString()}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          // Range from 0 to 2
          min={0}
          max={2}
          // Increase by 0.1
          step={0.1}
        />
      </div>

      <Button
        onPress={() => {
          // Add new agent
          const agent: UserAgent = {
            name: name,
            description: description,
            version: version,
            availableMethods: methods,
            systemPrompt: systemPrompt,
            author: {
              publisher: "You",
            },
            LLMConfig: {
              modelId: `${provider}/${modelName}`,
              temperature: temperature,
            },
          };

          editorContext?.setPersistSettings((prev) => {
            return {
              ...prev,
              userAgents: [...(prev?.userAgents ?? []), agent],
            };
          });

          toast.success("Added new agent");
          setIsCreatingNewAgent(false);
        }}
      >
        Add Agent
      </Button>
    </div>
  );
}

function ProviderConfig({ usage }: { usage: LLMUsage }) {
  const editorContext = useContext(EditorContext);
  const [apiKey, setApiKey] = useState("");
  const [isRevealable, setIsRevealable] = useState(true);

  useEffect(() => {
    const key = editorContext?.persistSettings?.apiKeys
      ? editorContext?.persistSettings?.apiKeys[usage.provider]
      : undefined;

    if (key) {
      setApiKey("API Key is not visible after entered.");
      setIsRevealable(false);
    }
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2">
        <p>Provider:</p>
        <p>{usage.provider}</p>

        <p>Used Models:</p>
        <p>{usage.usedModals.join(", ")}</p>

        <p>Used by agents:</p>
        <p>{usage.usedByAgents.join(", ")}</p>

        <p>Total number of agents:</p>
        <p>{usage.totalUsageByAgents}</p>
      </div>
      <PasswordInput
        className="w-full"
        label="API Key"
        size="sm"
        isRevealable={isRevealable}
        isReadOnly={!isRevealable}
        isDeletable={apiKey.length > 0}
        onDelete={() => {
          editorContext?.setPersistSettings((prev) => {
            const newApiKeys = { ...prev?.apiKeys };
            delete newApiKeys[usage.provider];

            return {
              ...prev,
              apiKeys: newApiKeys,
            };
          });
          setApiKey("");
          setIsRevealable(true);
        }}
        value={apiKey}
        onValueChange={(value) => {
          editorContext?.setPersistSettings((prev) => {
            return {
              ...prev,
              apiKeys: {
                ...prev?.apiKeys,
                [usage.provider]: value,
              },
            };
          });
          setApiKey(value);
        }}
      />
    </div>
  );
}

function ProviderConfigs({ llmUsageList }: { llmUsageList: LLMUsage[] }) {
  return (
    <div>
      <p className="font-semibold">LLM Usage by Agents</p>
      <div className="w-full space-y-1">
        {llmUsageList.map((usage, index) => (
          <div key={usage.provider} className="w-full space-y-1">
            {index > 0 && <Divider />}
            <ProviderConfig usage={usage} />
          </div>
        ))}
      </div>
    </div>
  );
}
