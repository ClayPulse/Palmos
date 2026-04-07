"use client";

import { useState } from "react";
import { Workflow } from "@/lib/types";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import Icon from "@/components/misc/icon";
import {
  addToast,
  Button,
  Checkbox,
  Chip,
  Divider,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-y-1">
      <p className="text-xs font-medium opacity-60">{label}</p>
      <div className="flex gap-x-2">
        <Input
          value={value}
          isReadOnly
          size="sm"
          classNames={{ input: "text-xs font-mono" }}
        />
        <Tooltip content="Copy">
          <Button
            isIconOnly
            size="sm"
            variant="flat"
            onPress={() => {
              navigator.clipboard.writeText(value);
              addToast({
                title: "Copied",
                description: `${label} copied to clipboard.`,
                color: "success",
              });
            }}
          >
            <Icon name="content_copy" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

export default function WorkflowDetailsModal({
  workflow,
  isOpen,
  onClose,
}: {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
}) {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://palmos.ai";
  const apiEndpoint = workflow.id
    ? `${apiBaseUrl}/api/workflow/run/${workflow.id}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-x-2">
          <Icon name="account_tree" className="text-primary" />
          Workflow Details
        </ModalHeader>
        <ModalBody className="flex flex-col gap-y-4">
          {/* Name & Version */}
          <div className="flex items-center gap-x-3">
            <h3 className="text-lg font-semibold">{workflow.name}</h3>
            <Chip size="sm" variant="flat">
              v{workflow.version}
            </Chip>
            <Chip
              size="sm"
              variant="flat"
              color={
                workflow.visibility === "public"
                  ? "success"
                  : workflow.visibility === "unlisted"
                    ? "warning"
                    : "default"
              }
            >
              {workflow.visibility}
            </Chip>
          </div>

          {/* Description */}
          {workflow.description && (
            <p className="text-sm text-default-500">{workflow.description}</p>
          )}

          <Divider />

          {/* Copyable fields */}
          <div className="flex flex-col gap-y-3">
            {workflow.id && (
              <CopyRow label="Workflow ID" value={workflow.id} />
            )}
            <CopyRow label="Name" value={workflow.name} />
            <CopyRow label="Version" value={workflow.version} />
          </div>

          {/* API Endpoint */}
          {apiEndpoint && (
            <>
              <Divider />
              <div className="flex flex-col gap-y-2">
                <p className="text-sm font-semibold">API Endpoint</p>
                <p className="text-xs opacity-60">
                  Run this workflow programmatically. Send a POST request with
                  your input arguments as the JSON body.
                </p>
                <CopyRow label="URL" value={apiEndpoint} />
                <div className="bg-content2 rounded-lg p-3">
                  <p className="text-xs font-mono opacity-80 whitespace-pre-wrap">{`curl -X POST ${apiEndpoint} \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"input-text": "hello"}'`}</p>
                </div>
              </div>
            </>
          )}
          {/* Webhook Setup */}
          {apiEndpoint && (
            <>
              <Divider />
              <WebhookSetupSection
                workflowId={workflow.id}
                apiEndpoint={apiEndpoint}
                initialVerifyToken={workflow.webhookVerifyToken}
              />
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const PLATFORMS = [
  {
    key: "generic",
    label: "Generic Webhook",
    needsVerifyToken: false,
    buildUrl: (endpoint: string) => `${endpoint}?platform=generic`,
    instructions:
      "Send a POST request to the URL above with your input arguments as the JSON body.",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    needsVerifyToken: true,
    buildUrl: (endpoint: string) => `${endpoint}?platform=whatsapp`,
    instructions:
      "Use the Callback URL and Verify Token below in your Meta App Dashboard under WhatsApp > Configuration > Webhook.",
  },
  {
    key: "instagram",
    label: "Instagram",
    needsVerifyToken: true,
    buildUrl: (endpoint: string) => `${endpoint}?platform=instagram`,
    instructions:
      "Use the Callback URL and Verify Token below in your Meta App Dashboard under Instagram > Webhooks.",
  },
  {
    key: "facebook",
    label: "Facebook",
    needsVerifyToken: true,
    buildUrl: (endpoint: string) => `${endpoint}?platform=facebook`,
    instructions:
      "Use the Callback URL and Verify Token below in your Meta App Dashboard under Facebook > Webhooks.",
  },
];

function WebhookSetupSection({
  workflowId,
  apiEndpoint,
  initialVerifyToken,
}: {
  workflowId?: string;
  apiEndpoint: string;
  initialVerifyToken?: string;
}) {
  const [platform, setPlatform] = useState("generic");
  const [verifyToken, setVerifyToken] = useState(initialVerifyToken ?? "");
  const [generatingVerify, setGeneratingVerify] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [generatingApiKey, setGeneratingApiKey] = useState(false);
  const [noBeta, setNoBeta] = useState(false);
  const [attachApiKey, setAttachApiKey] = useState(false);
  const selected = PLATFORMS.find((p) => p.key === platform) ?? PLATFORMS[0];

  const callbackUrl = (() => {
    const base = selected.buildUrl(apiEndpoint);
    if (attachApiKey && apiKey) {
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}apiKey=${encodeURIComponent(apiKey)}`;
    }
    return base;
  })();

  async function generateVerifyToken() {
    if (!workflowId) return;
    setGeneratingVerify(true);
    try {
      const res = await fetchAPI("/api/workflow/generate-verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setVerifyToken(data.webhookVerifyToken);
      addToast({
        title: "Token generated",
        description: "Verify token has been saved.",
        color: "success",
      });
    } catch {
      addToast({
        title: "Failed to generate token",
        color: "danger",
      });
    } finally {
      setGeneratingVerify(false);
    }
  }

  async function generateApiKey() {
    setGeneratingApiKey(true);
    setNoBeta(false);
    try {
      const res = await fetchAPI("/api/api-keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Webhook API Key" }),
      });
      if (res.status === 403) {
        setNoBeta(true);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApiKey(data.key);
      addToast({
        title: "API key created",
        description: "Save this key — it won't be shown again.",
        color: "success",
      });
    } catch {
      addToast({
        title: "Failed to create API key",
        color: "danger",
      });
    } finally {
      setGeneratingApiKey(false);
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <p className="text-sm font-semibold">Webhook Verification</p>
      <Select
        label="Platform"
        size="sm"
        selectedKeys={[platform]}
        onSelectionChange={(keys) => {
          const key = Array.from(keys)[0] as string;
          if (key) setPlatform(key);
        }}
      >
        {PLATFORMS.map((p) => (
          <SelectItem key={p.key}>{p.label}</SelectItem>
        ))}
      </Select>
      <p className="text-xs opacity-60">{selected.instructions}</p>

      {/* Step 1: API Key */}
      {apiKey ? (
        <CopyRow label="Pulse API Key" value={apiKey} />
      ) : noBeta ? (
        <div className="bg-warning-50 rounded-lg p-3 flex flex-col gap-y-2">
          <p className="text-xs text-warning-700">
            Beta access is required to generate API keys.
          </p>
          <Link href="/beta" size="sm" color="warning" isExternal>
            Join the Beta →
          </Link>
        </div>
      ) : (
        <Button
          size="sm"
          color="primary"
          variant="flat"
          onPress={generateApiKey}
          isLoading={generatingApiKey}
          startContent={<Icon name="key" />}
        >
          Generate Pulse API Key
        </Button>
      )}

      {/* Step 2: Callback URL + optional verify token */}
      {apiKey && (
        <>
          <Checkbox
            size="sm"
            isSelected={attachApiKey}
            onValueChange={setAttachApiKey}
          >
            <span className="text-xs">Attach API key to callback URL</span>
          </Checkbox>
          <CopyRow label="Callback URL" value={callbackUrl} />

          {selected.needsVerifyToken && (
            <>
              {verifyToken ? (
                <>
                  <CopyRow label="Verify Token" value={verifyToken} />
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={generateVerifyToken}
                    isLoading={generatingVerify}
                  >
                    Regenerate Verify Token
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  color="primary"
                  onPress={generateVerifyToken}
                  isLoading={generatingVerify}
                  startContent={<Icon name="verified_user" />}
                >
                  Generate Verify Token
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
