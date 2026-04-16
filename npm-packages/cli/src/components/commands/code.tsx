import fs from "fs";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import JSZip from "jszip";
import { Result } from "meow";
import path from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBackendUrl } from "../../lib/backend-url.js";
import { Flags } from "../../lib/cli-flags.js";
import { checkToken, getToken } from "../../lib/token.js";

type AgentTaskMessageDataType = "notification" | "toolCall" | "artifactOutput";

type AgentTaskMessageData = {
  type?: AgentTaskMessageDataType;
  title?: string;
  description?: string;
  toolName?: string;
  parameters?: Record<string, unknown>;
  error?: string;
  result?: string;
};

type AgentTaskMessage = {
  type: "creation";
  messageId: number;
  data: AgentTaskMessageData;
  isFinal?: boolean;
};

type AgentTaskMessageUpdate = {
  type: "update";
  messageId: number;
  updateType: "append";
  delta: AgentTaskMessageData;
  isFinal?: boolean;
};

type ArtifactOutput = {
  publishedAppLink?: string;
  sourceCodeArchiveLink?: string;
  appId?: string;
  version?: string;
};

type ContinueData = {
  appId: string;
  version: string;
  name: string;
};

function readContinueData(cwd: string): ContinueData | null {
  const pkgPath = path.resolve(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return null;
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<
      string,
      unknown
    >;
    const name = typeof pkg["name"] === "string" ? pkg["name"] : undefined;
    const version =
      typeof pkg["version"] === "string" ? pkg["version"] : undefined;
    const appId = typeof pkg["appId"] === "string" ? pkg["appId"] : name;
    if (!appId || !version) {
      return null;
    }

    return { appId, version, name: name ?? appId };
  } catch {
    return null;
  }
}

function makeAppName(prompt: string) {
  const normalized = prompt
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join("_");

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${normalized || "pulse_app"}_${suffix}`;
}

function parseArtifact(result: string | undefined): ArtifactOutput | undefined {
  if (!result) {
    return undefined;
  }

  try {
    return JSON.parse(result) as ArtifactOutput;
  } catch {
    return undefined;
  }
}

export default function Code({ cli }: { cli: Result<Flags> }) {
  // ── Continue mode ────────────────────────────────────────────────────────
  const continueData = useMemo<ContinueData | null | undefined>(() => {
    if (!cli.flags.continue) return undefined;
    return readContinueData(process.cwd());
  }, [cli.flags.continue]);

  // ── Resolved inputs ──────────────────────────────────────────────────────
  const [appName, setAppName] = useState<string | undefined>(() => {
    if (cli.flags.name) return cli.flags.name;
    if (cli.flags.continue) {
      const data = readContinueData(process.cwd());
      return data?.name ?? undefined;
    }

    return undefined;
  });
  const [appNameInput, setAppNameInput] = useState("");

  const [prompt, setPrompt] = useState<string | undefined>(undefined);
  const [promptInput, setPromptInput] = useState("");

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Generation state ─────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const generationStartRef = useRef<number | undefined>(undefined);

  const [statusLines, setStatusLines] = useState<
    Array<{ text: string; messageId?: number; toolTitle?: string }>
  >([]);

  // Per-message live streaming buffers
  const [liveBuffers, setLiveBuffers] = useState<Map<number, string>>(
    new Map(),
  );

  const [toolCallErrors, setToolCallErrors] = useState<string[]>([]);

  const [artifact, setArtifact] = useState<ArtifactOutput | undefined>(
    undefined,
  );

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedPath, setDownloadedPath] = useState<string | undefined>(
    undefined,
  );
  const [downloadError, setDownloadError] = useState<string | undefined>(
    undefined,
  );

  const token = useMemo(() => getToken(cli.flags.stage), [cli.flags.stage]);

  // Pre-fill prompt from inline CLI args, e.g. `pulse code "my prompt"`
  useEffect(() => {
    const initialPrompt = cli.input.slice(1).join(" ").trim();
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [cli.input]);

  useEffect(() => {
    async function runAuthCheck() {
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      const isValid = await checkToken(
        token,
        cli.flags.stage,
        cli.flags.stageServer,
      );
      setIsAuthenticated(isValid);
      setIsCheckingAuth(false);
    }

    runAuthCheck();
  }, [token, cli.flags.stage]);

  useEffect(() => {
    async function runCodeGeneration(
      userPrompt: string,
      resolvedAppName: string,
    ) {
      if (!token) {
        setError("Missing access token. Please run pulse login first.");
        return;
      }

      setError(undefined);
      setStatusLines([]);
      setLiveBuffers(new Map() as Map<number, string>);
      setToolCallErrors([]);
      setArtifact(undefined);
      setIsDownloading(false);
      setDownloadedPath(undefined);
      setDownloadError(undefined);
      generationStartRef.current = Date.now();
      setElapsedSeconds(0);
      setIsGenerating(true);

      const controller = new AbortController();
      let didTimeout = false;
      const timeoutId = setTimeout(
        () => {
          didTimeout = true;
          controller.abort("Generation timeout after 5 minutes");
        },
        5 * 60 * 1000,
      );

      const collectedMessages = new Map<number, AgentTaskMessage>();
      // Per-message live streaming buffers
      const localBuffers = new Map<number, string>();
      let _artifact: ArtifactOutput | undefined = undefined;

      try {
        const response = await fetch(
          `${getBackendUrl(cli.flags.stage, cli.flags.stageServer)}/api/server-function/vibe_dev_flow/latest/generate-code/v2/generate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: userPrompt,
              ...(continueData
                ? {
                    appId: continueData.appId,
                    version: continueData.version,
                  }
                : {
                    appName: resolvedAppName,
                  }),
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Code generation failed: ${response.status} ${response.statusText} - ${await response.text()}`,
          );
        }

        if (!response.body) {
          throw new Error("No stream returned from server.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data:")) {
              continue;
            }

            const json = part.replace(/^data:\s*/, "");

            let message: AgentTaskMessage | AgentTaskMessageUpdate;
            try {
              message = JSON.parse(json) as
                | AgentTaskMessage
                | AgentTaskMessageUpdate;
            } catch {
              continue;
            }

            if (message.type === "creation") {
              collectedMessages.set(message.messageId, message);

              if (message.data.type === "notification") {
                const text = [message.data.title, message.data.description]
                  .filter(Boolean)
                  .join(": ");
                if (text.length > 0) {
                  setStatusLines((previous) => [...previous, { text }]);
                }
              }

              if (message.data.type === "toolCall") {
                const label = message.data.title
                  ? `Tool call: ${message.data.title}`
                  : "Tool call executed";

                setStatusLines((previous) => [
                  ...previous,
                  {
                    text: label,
                    messageId: message.messageId,
                    toolTitle: message.data.title,
                  },
                ]);
                // Start tracking this tool call's buffer
                localBuffers.set(
                  message.messageId,
                  message.data.description
                    ? `${message.data.description}\n`
                    : "",
                );
                setLiveBuffers(new Map(localBuffers));
              }

              if (message.data.type === "artifactOutput") {
                _artifact = parseArtifact(message.data.result);
                setArtifact(_artifact);
              }
            } else {
              // update message
              const existing = collectedMessages.get(message.messageId);
              if (!existing) {
                continue;
              }

              const deltaResult = message.delta.result ?? "";
              const deltaError = message.delta.error ?? "";

              existing.data.result = (existing.data.result ?? "") + deltaResult;
              existing.data.error = (existing.data.error ?? "") + deltaError;
              existing.isFinal = message.isFinal;

              // Accumulate delta into this message's own buffer
              if (
                localBuffers.has(message.messageId) &&
                deltaResult.length > 0
              ) {
                const current = localBuffers.get(message.messageId) ?? "";
                localBuffers.set(message.messageId, current + deltaResult);
                setLiveBuffers(new Map(localBuffers));
              }

              // Surface tool-level errors when the message is finalized
              if (message.isFinal && existing.data.error) {
                const errText = existing.data.error.trim();
                if (errText.length > 0) {
                  setToolCallErrors((previous) => [...previous, errText]);
                }
              }
            }
          }
        }

        setIsGenerated(true);

        // Download the source zip
        if (_artifact && _artifact.appId) {
          setIsDownloading(true);
          try {
            // Step 1: exchange the archive endpoint for a SAS URL
            const sasEndpoint = `${getBackendUrl(cli.flags.stage, cli.flags.stageServer)}/api/app/source?app=${encodeURIComponent(_artifact.appId)}`;

            const sasResponse = await fetch(sasEndpoint, {
              headers: {
                Accept: "application/zip",
                Authorization: `Bearer ${token}`,
              },
            });
            if (!sasResponse.ok) {
              throw new Error(
                `Failed to get download link for ${_artifact.appId}: ${sasResponse.status} ${sasResponse.statusText}`,
              );
            }
            const { url: sasUrl } = (await sasResponse.json()) as {
              url: string;
            };

            console.log(`SAS URL for ${_artifact.appId}: ${sasUrl}`);

            // Step 2: download the actual zip from the SAS URL
            const downloadResponse = await fetch(sasUrl);
            if (!downloadResponse.ok) {
              throw new Error(
                `Failed to download archive: ${downloadResponse.status} ${downloadResponse.statusText}`,
              );
            }
            const arrayBuffer = await downloadResponse.arrayBuffer();

            // Extract zip in-memory and write files one by one
            const zip = await JSZip.loadAsync(arrayBuffer);
            const destDir = process.cwd();
            for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
              if (zipEntry.dir) continue;
              const filePath = path.join(destDir, relativePath);
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              const content = await zipEntry.async("nodebuffer");
              fs.writeFileSync(filePath, content);
            }
            setDownloadedPath(destDir);
          } catch (downloadErr) {
            setDownloadError(
              downloadErr instanceof Error
                ? downloadErr.message
                : "Failed to download source archive.",
            );
          } finally {
            setIsDownloading(false);
          }
        }
      } catch (generationError: any) {
        if (controller.signal.aborted && didTimeout) {
          setError("Code generation timed out after 5 minutes.");
        } else {
          setError(
            generationError instanceof Error
              ? generationError.message
              : "Failed to generate code.",
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (generationStartRef.current !== undefined) {
          setElapsedSeconds(
            Math.floor((Date.now() - generationStartRef.current) / 1000),
          );
        }
        setIsGenerating(false);
      }
    }

    if (isAuthenticated && prompt && appName && continueData !== null) {
      runCodeGeneration(prompt, appName);
    }
  }, [prompt, appName, cli.flags.stage, isAuthenticated, token, continueData]);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      if (generationStartRef.current !== undefined) {
        setElapsedSeconds(
          Math.floor((Date.now() - generationStartRef.current) / 1000),
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }

  function getLiveLines(
    messageId: number,
    toolTitle: string | undefined,
  ): { lines: string[]; truncated: boolean } {
    const text = liveBuffers.get(messageId);
    if (!text) return { lines: [], truncated: false };
    const all = text.split("\n").filter((l) => l.length > 0);
    if (toolTitle === "Agent Message") {
      return { lines: all, truncated: false };
    }
    const truncated = all.length > 8;
    return { lines: all.slice(-8), truncated };
  }

  return (
    <>
      {isCheckingAuth ? (
        <Box>
          <Spinner type="dots" />
          <Text> Checking authentication...</Text>
        </Box>
      ) : !isAuthenticated ? (
        <Text color="redBright">
          ⛔ You are not authenticated. Run pulse login and try again.
        </Text>
      ) : cli.flags.continue && continueData === null ? (
        <Text color="redBright">
          ⛔ Could not read app name and version from package.json in the
          current directory. Make sure a valid package.json with
          &quot;name&quot;, &quot;version&quot; (and optionally
          &quot;appId&quot;) exists.
        </Text>
      ) : appName === undefined ? (
        // Step 1 — app name
        <Box>
          <Text>App name: </Text>
          <TextInput
            value={appNameInput}
            onChange={setAppNameInput}
            onSubmit={(value) => {
              const trimmed = value.trim();
              setAppName(trimmed.length > 0 ? trimmed : makeAppName(""));
            }}
          />
        </Box>
      ) : prompt === undefined ? (
        // Step 2 — prompt
        <Box>
          <Text>Describe the Pulse app you want to generate: </Text>
          <TextInput
            value={promptInput}
            onChange={setPromptInput}
            onSubmit={(value) => {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                return;
              }
              setPrompt(trimmed);
            }}
          />
        </Box>
      ) : (
        // Step 3 — generating
        <>
          {cli.flags.continue && continueData && (
            <Text dimColor>
              Continuing from v{continueData.version} ({continueData.appId})
            </Text>
          )}
          <Text>
            App name: <Text color="yellow">{appName}</Text>
          </Text>
          <Text>
            Prompt: <Text color="cyan">{prompt}</Text>
          </Text>
          {isGenerating && (
            <Box>
              <Spinner type="dots" />
              <Text> Generating app... </Text>
              <Text color="gray">[{formatElapsed(elapsedSeconds)}]</Text>
            </Box>
          )}
          {statusLines.map((item, index) => {
            const { lines, truncated } =
              item.messageId !== undefined
                ? getLiveLines(item.messageId, item.toolTitle)
                : { lines: [], truncated: false };
            return (
              <Box key={`${item.text}-${index}`} flexDirection="column">
                <Text dimColor={index < statusLines.length - 1}>
                  • {item.text}
                </Text>
                {lines.length > 0 && (
                  <Box
                    borderStyle="round"
                    borderColor="gray"
                    flexDirection="column"
                    paddingX={1}
                  >
                    {truncated && (
                      <Text color="gray" dimColor>
                        &lt;truncated&gt;
                      </Text>
                    )}
                    {lines.map((line, lineIndex) => (
                      <Text key={lineIndex} color="gray">
                        {line}
                      </Text>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
          {toolCallErrors.map((err, index) => (
            <Text key={index} color="redBright">
              ❌ {err}
            </Text>
          ))}
          {error && <Text color="redBright">❌ {error}</Text>}
          {isGenerated && !error && (
            <Text color="greenBright">
              ✅ Code generation completed in {formatElapsed(elapsedSeconds)}.
            </Text>
          )}
          {artifact?.publishedAppLink && (
            <Text color="greenBright">
              Preview: {artifact.publishedAppLink}
            </Text>
          )}
          {artifact?.sourceCodeArchiveLink && (
            <Text color="greenBright">
              Source (.zip): {artifact.sourceCodeArchiveLink}
            </Text>
          )}
          {isDownloading && (
            <Box>
              <Spinner type="dots" />
              <Text> Downloading source archive...</Text>
            </Box>
          )}
          {downloadedPath && (
            <Text color="greenBright">Source extracted: {downloadedPath}</Text>
          )}
          {downloadError && (
            <Text color="redBright">❌ Download failed: {downloadError}</Text>
          )}
        </>
      )}
    </>
  );
}
