"use client";

import { MyAutomationsCarousel } from "@/components/agent-chat/chat-screens/carousels/my-automations-carousel";
import { MyWorkflowsCarousel } from "@/components/agent-chat/chat-screens/carousels/my-workflows-carousel";
import {
  STARTER_PROMPTS,
  StarterPromptButton,
} from "@/components/agent-chat/input/starter-prompts";
import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { useMarketplaceWorkflows } from "@/lib/hooks/marketplace/use-marketplace-workflows";
import { useAutomations } from "@/lib/hooks/use-automations";
import { useTranslations } from "@/lib/hooks/use-translations";
import type {
  OnboardingSuggestion,
  ProjectAnalysisInfo,
  ProjectInfo,
} from "@/lib/types";
import {
  addToast,
  Button,
  Checkbox,
  Input,
  Spinner,
  Textarea,
} from "@heroui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const PROJECTS_PER_PAGE = 4;


// ── Use-case suggestions shown below the onboarding form ────────────────────

const USE_CASE_SUGGESTIONS = [
  {
    icon: "mail",
    title: "Auto-respond to emails",
    description: "Draft and send personalized replies to customer emails",
  },
  {
    icon: "campaign",
    title: "Social media posting",
    description: "Schedule and publish content across platforms",
  },
  {
    icon: "receipt_long",
    title: "Invoice processing",
    description: "Extract data from invoices and update your records",
  },
  {
    icon: "support_agent",
    title: "Customer support tickets",
    description: "Route and respond to support requests automatically",
  },
];

export default function HomeScreen({
  onSend,
  projects,
  activeProject,
  onOnboardingComplete,
  onAnalyzingChange,
}: {
  onSend: (text: string) => void;
  projects: ProjectInfo[];
  activeProject?: ProjectInfo;
  onOnboardingComplete?: (analysis: ProjectAnalysisInfo) => void;
  onAnalyzingChange?: (isAnalyzing: boolean) => void;
}) {
  const [rerunning, setRerunning] = useState(false);
  const editorContext = useContext(EditorContext);

  const handleRerunAnalysis = useCallback(() => {
    if (!activeProject?.id) return;
    setRerunning(true);
  }, [activeProject?.id]);

  const handleRerunComplete = useCallback(
    (analysis: ProjectAnalysisInfo) => {
      setRerunning(false);
      onOnboardingComplete?.(analysis);
    },
    [onOnboardingComplete],
  );

  // Ensure input bar is shown when in project view (not onboarding)
  const isInProjectView = !!activeProject?.projectAnalysis && !rerunning;
  useEffect(() => {
    if (isInProjectView) {
      onAnalyzingChange?.(false);
    }
  }, [isInProjectView, onAnalyzingChange]);

  // If we have an active project with analysis done (and not re-running), show the project view
  if (isInProjectView) {
    return (
      <ProjectView
        project={activeProject!}
        onSend={onSend}
        onRerunAnalysis={handleRerunAnalysis}
      />
    );
  }

  // Otherwise show the onboarding / home view
  return (
    <OnboardingView
      projects={projects}
      activeProject={activeProject}
      onOnboardingComplete={rerunning ? handleRerunComplete : onOnboardingComplete}
      onAnalyzingChange={onAnalyzingChange}
    />
  );
}

// ── Onboarding view (home / no project) ─────────────────────────────────────

function OnboardingView({
  projects,
  activeProject,
  onOnboardingComplete,
  onAnalyzingChange,
}: {
  projects: ProjectInfo[];
  activeProject?: ProjectInfo;
  onOnboardingComplete?: (analysis: ProjectAnalysisInfo) => void;
  onAnalyzingChange?: (isAnalyzing: boolean) => void;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);

  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const streamEndRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<OnboardingSuggestion[]>([]);
  const [analysisResult, setAnalysisResult] =
    useState<ProjectAnalysisInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<
    { url: string; title: string }[]
  >([]);
  const [projectName, setProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signal parent to hide input bar when in analysis/results view
  const isInAnalysisView = isStreaming || !!streamedText || suggestions.length > 0 || !!error;
  useEffect(() => {
    onAnalyzingChange?.(isInAnalysisView);
  }, [isInAnalysisView, onAnalyzingChange]);

  // Scroll to bottom when streaming finishes (buttons appear)
  const prevIsStreaming = useRef(isStreaming);
  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming) {
      setTimeout(() => {
        streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
    prevIsStreaming.current = isStreaming;
  }, [isStreaming]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles(Array.from(e.target.files));
      }
    },
    [],
  );

  function openProject(name: string) {
    editorContext?.setEditorStates((prev) => ({ ...prev, project: name }));
  }

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;

    setIsStreaming(true);
    setError(null);
    setStreamedText("");
    setSuggestions([]);
    setSearchSources([]);

    try {
      const projectId = activeProject?.id;

      const res = await fetchAPI("/api/agent/onboarding/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined,
          message: description,
          websiteUrl: websiteUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(
          errBody?.error === "upgrade_required"
            ? "Please upgrade your plan to use this feature."
            : `Request failed: ${res.status}`,
        );
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventType = "";
          let dataStr = "";

          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr += line.slice(6);
            }
          }

          if (!eventType || !dataStr) continue;

          let parsed: any;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventType === "messages") {
            const chunk = Array.isArray(parsed) ? parsed[0] : parsed;
            const kwargs = chunk?.kwargs ?? chunk;
            const rawContent = kwargs?.content;

            // Extract text from string or content block array
            let text = "";
            if (typeof rawContent === "string") {
              text = rawContent;
            } else if (Array.isArray(rawContent)) {
              for (const block of rawContent) {
                if (block && typeof block === "object" && typeof block.text === "string") {
                  text += block.text;
                }
              }
            }

            if (text) {
              fullText += text;

              // Try to parse the structured JSON response incrementally
              const jsonMatch = fullText.match(/```json\s*([\s\S]*?)(?:```|$)/);
              if (jsonMatch) {
                const jsonStr = jsonMatch[1].trim();

                // Extract "text" field for display (complete or partial)
                const textMatch = jsonStr.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
                if (textMatch) {
                  try {
                    // Try to parse as complete JSON string
                    setStreamedText(JSON.parse('"' + textMatch[1] + '"'));
                  } catch {
                    // Partial — unescape what we can
                    setStreamedText(
                      textMatch[1]
                        .replace(/\\n/g, "\n")
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, "\\"),
                    );
                  }
                  // Auto-scroll
                  streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }

                // Extract citations
                const citationsMatch = jsonStr.match(/"citations"\s*:\s*(\[[\s\S]*?\])(?=\s*,?\s*"(?:suggestions|text)"|$)/);
                if (citationsMatch) {
                  try {
                    const cits = JSON.parse(citationsMatch[1]);
                    if (Array.isArray(cits)) {
                      setSearchSources(cits.filter((c: any) => c?.url).map((c: any) => ({
                        url: c.url,
                        title: c.title || c.url,
                      })));
                    }
                  } catch {
                    // still streaming
                  }
                }

                // Extract individual suggestion objects as they complete
                const suggestionsStart = jsonStr.indexOf('"suggestions"');
                if (suggestionsStart !== -1) {
                  const afterKey = jsonStr.slice(suggestionsStart);
                  const objectRegex = /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*\}/g;
                  const matches = afterKey.match(objectRegex);
                  if (matches) {
                    const parsedSuggestions: OnboardingSuggestion[] = [];
                    for (const m of matches) {
                      try {
                        const obj = JSON.parse(m);
                        if (obj.title && obj.description) {
                          parsedSuggestions.push(obj);
                        }
                      } catch {
                        // incomplete
                      }
                    }
                    if (parsedSuggestions.length > 0) {
                      setSuggestions(parsedSuggestions);
                      // Auto-scroll when new card appears
                      setTimeout(() => {
                        streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }
                  }
                }
              } else {
                // No JSON block yet — show raw text (pre-JSON response)
                setStreamedText(fullText);
              }
            }

            // Extract web search sources from annotations (OpenAI format)
            if (Array.isArray(rawContent)) {
              for (const block of rawContent) {
                if (block?.annotations && Array.isArray(block.annotations)) {
                  for (const ann of block.annotations) {
                    if (
                      (ann?.type === "url_citation" || ann?.source === "url_citation") &&
                      typeof ann.url === "string"
                    ) {
                      setSearchSources((prev) => {
                        if (prev.some((s) => s.url === ann.url)) return prev;
                        return [
                          ...prev,
                          { url: ann.url, title: ann.title || ann.url },
                        ];
                      });
                    }
                  }
                }
              }
            }
          } else if (eventType === "onboarding_complete") {
            const pa = parsed?.projectAnalysis as any;
            if (pa) {
              const analysis: ProjectAnalysisInfo = {
                id: pa.id,
                summary: pa.summary,
                insights: pa.insights,
                completedAt: pa.completedAt,
              };
              setAnalysisResult(analysis);
              setStreamedText(pa.summary ?? "");
              if (Array.isArray(pa.insights) && pa.insights.length > 0) {
                setSuggestions(pa.insights);
              }
              if (Array.isArray(pa.citations) && pa.citations.length > 0) {
                setSearchSources(pa.citations.filter((c: any) => c?.url).map((c: any) => ({
                  url: c.url,
                  title: c.title || c.url,
                })));
              }
            }
          } else if (eventType === "error") {
            throw new Error(parsed?.message ?? "Agent error");
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [description, websiteUrl, activeProject?.id]);

  const impactColors: Record<string, string> = {
    high: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/15",
    medium:
      "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15",
    low: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-500/15",
  };

  // ── Streaming / results / error view ────────────────────────────────────────
  if (isStreaming || streamedText || suggestions.length > 0 || error) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="w-full max-w-xl">
          <div className="mb-4 flex items-center gap-3">
            {isStreaming && <Spinner size="sm" />}
            <h2 className="text-default-800 text-base font-semibold dark:text-white/90">
              {isStreaming
                ? "Analyzing your business..."
                : error
                  ? "Analysis failed"
                  : "Analysis complete"}
            </h2>
          </div>
          {streamedText && (
            <div className="text-default-600 rounded-xl border border-default-200 bg-default-50 p-4 text-sm whitespace-pre-wrap dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {streamedText}
            </div>
          )}
          {searchSources.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-default-500 dark:text-white/50 mb-1.5">
                Sources searched
              </p>
              <div className="flex flex-wrap gap-1.5">
                {searchSources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-default-200 bg-default-50 px-2 py-1 text-[11px] text-default-500 transition-colors hover:bg-default-100 hover:text-default-700 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/70"
                    title={source.url}
                  >
                    <Icon name="language" variant="round" className="text-xs" />
                    <span className="max-w-[200px] truncate">
                      {source.title}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion cards appearing one at a time during streaming */}
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-default-500 dark:text-white/50 mb-2">
                {isStreaming ? "Generating suggestions..." : "Suggestions"}
              </p>
              <AnimatePresence mode="popLayout">
                <div className="flex flex-col gap-2.5">
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={`${s.title}-${i}`}
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.35,
                        delay: i * 0.08,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="rounded-xl border border-default-200 bg-default-50 p-3.5 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-default-800 text-sm font-semibold dark:text-white/90">
                            {s.title}
                          </h3>
                          <p className="text-default-500 mt-1 text-xs dark:text-white/50">
                            {s.description}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${impactColors[s.impact] ?? impactColors.low}`}
                        >
                          {s.impact === "high" ? "Critical bottleneck" : s.impact === "medium" ? "Needs improvement" : "Nice to have"}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}

          {error && (
            <div className="mt-3">
              <p className="text-sm text-red-500">{error}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="flat"
                onPress={() => {
                  setError(null);
                  setStreamedText("");
                }}
              >
                Try again
              </Button>
            </div>
          )}

          {/* Post-analysis action */}
          {!isStreaming && suggestions.length > 0 && (
            !activeProject ? (
              // No project was selected — ask user to name their project
              <div className="mt-6 mb-32 rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
                <h3 className="text-default-800 text-sm font-semibold dark:text-white/90">
                  Create your AI automation project
                </h3>
                <p className="text-default-500 mt-1 text-xs dark:text-white/50">
                  Give your project a name to save these suggestions and start building
                </p>
                <div className="mt-3 flex gap-2">
                  <Input
                    placeholder="e.g. My Business Automations"
                    value={projectName}
                    onValueChange={setProjectName}
                    size="sm"
                    classNames={{
                      inputWrapper:
                        "border-default-200 dark:border-white/10 bg-white dark:bg-white/5",
                    }}
                    className="flex-1"
                  />
                  <Button
                    className="bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white"
                    size="sm"
                    isDisabled={!projectName.trim() || !analysisResult}
                    onPress={async () => {
                      try {
                        addToast({ title: "Creating project...", color: "default" });

                        // Create the project
                        const createRes = await fetchAPI("/api/project/create", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: projectName.trim() }),
                        });
                        if (!createRes.ok) {
                          const data = await createRes.json().catch(() => null);
                          throw new Error(data?.error || "Failed to create project");
                        }
                        const { id: newProjectId } = await createRes.json();

                        // Store the analysis on the new project
                        if (analysisResult) {
                          await fetchAPI("/api/agent/onboarding/save", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              projectId: newProjectId,
                              summary: analysisResult.summary,
                              insights: analysisResult.insights,
                              description: description,
                            }),
                          });
                        }

                        // Add the new project to the list and open it
                        const newProject: ProjectInfo = {
                          id: newProjectId,
                          name: projectName.trim(),
                          description: description,
                          role: "owner",
                          memberCount: 1,
                          workflowCount: 0,
                          projectAnalysis: analysisResult ?? null,
                        };
                        editorContext?.setEditorStates((prev) => ({
                          ...prev,
                          project: projectName.trim(),
                          projectsInfo: [
                            ...(prev.projectsInfo ?? []),
                            newProject,
                          ],
                        }));

                        // Clear analysis view so it transitions to project view
                        setStreamedText("");
                        setSuggestions([]);
                        setSearchSources([]);

                        addToast({ title: "Project created!", color: "success" });
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to create project");
                        addToast({ title: "Failed to create project", color: "danger" });
                      }
                    }}
                  >
                    Create Project
                  </Button>
                </div>
              </div>
            ) : (
              // Project already exists — just continue
              <Button
                className="mt-6 w-full"
                color="primary"
                size="lg"
                isDisabled={!analysisResult}
                onPress={() => {
                  if (!analysisResult) return;
                  setStreamedText("");
                  setSuggestions([]);
                  setSearchSources([]);
                  onOnboardingComplete?.(analysisResult);
                }}
              >
                Continue to Project
              </Button>
            )
          )}
          <div ref={streamEndRef} />
        </div>
      </div>
    );
  }

  // ── Default: onboarding form ──────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-full max-w-xl">
        {/* Hero */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
            <img
              src="/assets/pulse-logo.svg"
              alt="Palmos"
              className="h-8 w-8"
            />
          </div>
          <h2 className="text-default-800 text-lg font-semibold dark:text-white/90">
            {t("homeScreen.whatToBuild")}
          </h2>
          <p className="text-default-500 mt-1 text-sm dark:text-white/50">
            Tell us about your business and we&apos;ll suggest automations to
            save you time
          </p>
        </div>

        {/* Main textarea */}
        <Textarea
          placeholder="Describe your business, what you do, and what processes you'd like to automate..."
          value={description}
          onValueChange={setDescription}
          minRows={5}
          maxRows={12}
          classNames={{
            inputWrapper:
              "border-default-200 dark:border-white/10 bg-default-50 dark:bg-white/5",
          }}
        />

        {/* Secondary options */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Website URL (optional)"
            value={websiteUrl}
            onValueChange={setWebsiteUrl}
            type="url"
            size="sm"
            classNames={{
              inputWrapper:
                "border-default-200 dark:border-white/10 bg-default-50 dark:bg-white/5",
            }}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              size="sm"
              variant="flat"
              onPress={() => fileInputRef.current?.click()}
            >
              {files.length > 0 ? `${files.length} file(s)` : "Upload files"}
            </Button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <Button
          className="mt-5 w-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 transition-shadow"
          size="lg"
          isDisabled={!description.trim()}
          onPress={handleSubmit}
        >
          Analyze &amp; Optimize
        </Button>
      </div>

      {/* Use case suggestions */}
      <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {USE_CASE_SUGGESTIONS.map((uc) => (
          <button
            key={uc.title}
            type="button"
            className="flex items-start gap-3 rounded-xl border border-default-200/60 bg-white p-3.5 text-left transition-all hover:border-amber-300/60 hover:bg-amber-50/50 hover:shadow-sm dark:border-white/8 dark:bg-white/3 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/5"
            onClick={() => setDescription(uc.title + " — " + uc.description)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-500/10">
              <Icon
                name={uc.icon}
                variant="round"
                className="text-base text-amber-700 dark:text-amber-300"
              />
            </div>
            <div className="min-w-0">
              <p className="text-default-800 text-sm font-medium dark:text-white/85">
                {uc.title}
              </p>
              <p className="text-default-400 mt-0.5 text-xs dark:text-white/40">
                {uc.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Project list */}
      {projects.length > 0 && (
        <ProjectExplorer projects={projects} onOpen={openProject} />
      )}
    </div>
  );
}

// ── Project view (after onboarding) ─────────────────────────────────────────

function ProjectView({
  project,
  onSend,
  onRerunAnalysis,
}: {
  project: ProjectInfo;
  onSend: (text: string) => void;
  onRerunAnalysis?: () => void;
}) {
  const { getTranslations: t } = useTranslations();
  const editorContext = useContext(EditorContext);
  const {
    workflows: myWorkflows,
    isLoading: isLoadingWorkflows,
    mutate: mutateWorkflows,
  } = useMarketplaceWorkflows("My Workflows", project.id);
  const { automations, isLoading: isLoadingAutomations } = useAutomations();
  const [showAnalysis, setShowAnalysis] = useState(false);

  const activeAutomations = automations.filter((a) => a.enabled);
  const workflowCount = myWorkflows?.length ?? 0;
  const analysis = project.projectAnalysis;
  const insights = analysis?.insights;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Status banner */}
      <div className="w-full max-w-xl rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 shadow-sm dark:border-amber-500/15 dark:from-amber-500/5 dark:to-orange-500/5">
        <div className="flex items-start gap-4">
          <div className="animate-pulse-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 p-2 dark:bg-amber-500/15">
            <img
              src="/assets/pulse-logo.svg"
              alt="Palmos"
              className="h-full w-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-default-800 text-base font-semibold dark:text-white/90">
              {t("projectScreen.whatToWorkOn")}
            </h2>
            {activeAutomations.length > 0 || workflowCount > 0 ? (
              <div className="text-default-500 mt-1.5 flex items-center gap-3 text-xs dark:text-white/50">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {t("projectScreen.allSystemsNominal")}
                </span>
                {activeAutomations.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    {t("projectScreen.automationsActive", {
                      count: activeAutomations.length,
                    })}
                  </span>
                )}
                {workflowCount > 0 && (
                  <span>
                    {t("projectScreen.workflowsReady", {
                      count: workflowCount,
                    })}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-default-500 mt-0.5 text-sm dark:text-white/50">
                {t("projectScreen.describeIdea")}
              </p>
            )}

            {/* View analysis / re-run links */}
            {analysis && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  onClick={() => setShowAnalysis((v) => !v)}
                >
                  {showAnalysis ? "Hide analysis" : "View analysis"}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-default-400 hover:text-default-600 dark:text-white/40 dark:hover:text-white/60"
                  onClick={onRerunAnalysis}
                >
                  Re-run analysis
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable analysis */}
        {showAnalysis && analysis && (
          <div className="mt-4 rounded-xl border border-amber-200/40 bg-white/60 p-4 dark:border-amber-500/10 dark:bg-white/5">
            {analysis.summary ? (
              <div className="text-sm whitespace-pre-wrap text-default-600 dark:text-white/70">
                {analysis.summary}
              </div>
            ) : insights && insights.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-default-500 dark:text-white/50">
                  Suggested automations from your analysis:
                </p>
                <ul className="space-y-1.5">
                  {insights.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-default-600 dark:text-white/70"
                    >
                      <span className="font-medium">{s.title}</span>
                      {" — "}
                      <span className="text-default-400 dark:text-white/50">
                        {s.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-default-400 dark:text-white/40">
                No analysis details available. Try re-running the analysis.
              </p>
            )}
            {analysis.completedAt && (
              <p className="mt-3 text-[10px] text-default-300 dark:text-white/25">
                Analyzed{" "}
                {new Date(analysis.completedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Onboarding insights — suggested automations */}
      {insights && insights.length > 0 && (
        <div className="w-full max-w-xl">
          <h3 className="text-default-700 mb-3 text-sm font-semibold dark:text-white/70">
            Suggested for your business
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {insights.map((s, i) => (
              <InsightCard key={i} suggestion={s} onSend={onSend} />
            ))}
          </div>
        </div>
      )}

      {/* Starter prompts — hide when project has tailored insights */}
      {!(insights && insights.length > 0) && (
        <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER_PROMPTS.map((prompt) => (
            <StarterPromptButton
              key={prompt.labelKey}
              prompt={prompt}
              onSend={onSend}
            />
          ))}
        </div>
      )}

      {/* Automations */}
      <div className="w-full max-w-xl">
        {isLoadingAutomations ? (
          <div className="flex items-center justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : (
          <MyAutomationsCarousel
            automations={automations}
            onOpenEditor={(automation) => {
              editorContext?.updateModalStates({
                automationEditor: { isOpen: true, automation },
              });
            }}
            onCreateNew={() => {
              editorContext?.updateModalStates({
                automationEditor: { isOpen: true },
              });
            }}
          />
        )}
      </div>

      {/* Workflows */}
      <div className="w-full max-w-xl">
        {isLoadingWorkflows ? (
          <div className="flex items-center justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : myWorkflows && myWorkflows.length > 0 ? (
          <MyWorkflowsCarousel
            workflows={myWorkflows}
            onMutate={() => mutateWorkflows()}
            projectId={project.id}
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Shared components ───────────────────────────────────────────────────────

function InsightCard({
  suggestion,
  onSend,
}: {
  suggestion: OnboardingSuggestion;
  onSend: (text: string) => void;
}) {
  const impactColors: Record<string, string> = {
    high: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-500/15",
    medium:
      "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/15",
    low: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-500/15",
  };

  return (
    <button
      type="button"
      className="rounded-xl border border-default-200 bg-default-50 p-3.5 text-left transition-colors hover:bg-default-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      onClick={() =>
        onSend(
          `Build me a workflow: ${suggestion.title} — ${suggestion.description}`,
        )
      }
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-default-800 text-sm font-medium dark:text-white/90">
          {suggestion.title}
        </h4>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${impactColors[suggestion.impact] ?? impactColors.low}`}
        >
          {suggestion.impact === "high" ? "Critical bottleneck" : suggestion.impact === "medium" ? "Needs improvement" : "Nice to have"}
        </span>
      </div>
      <p className="text-default-500 mt-1 line-clamp-2 text-xs dark:text-white/50">
        {suggestion.description}
      </p>
    </button>
  );
}

function ProjectExplorer({
  projects,
  onOpen,
}: {
  projects: ProjectInfo[];
  onOpen: (name: string) => void;
}) {
  const { getTranslations: t } = useTranslations();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);
  const visible = projects.slice(
    page * PROJECTS_PER_PAGE,
    (page + 1) * PROJECTS_PER_PAGE,
  );

  return (
    <div className="w-full max-w-xl">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-default-500 text-xs font-medium tracking-wide uppercase dark:text-white/45">
          {t("homeScreen.myProjects")}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-default-400 hover:text-default-700 flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-30 dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="chevron_left" variant="round" className="text-sm" />
            </button>
            <span className="text-default-400 text-[10px] tabular-nums dark:text-white/40">
              {page + 1}/{totalPages}
            </span>
            <button
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="text-default-400 hover:text-default-700 flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-30 dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="chevron_right" variant="round" className="text-sm" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visible.map((project) => (
          <button
            key={project.id ?? project.name}
            onClick={() => onOpen(project.name)}
            className="border-default-200/60 flex items-start gap-3 rounded-xl border bg-white px-3.5 py-3 text-left transition-all hover:border-amber-300/60 hover:bg-amber-50/50 hover:shadow-sm dark:border-white/8 dark:bg-white/3 dark:hover:border-amber-500/25 dark:hover:bg-amber-500/5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/70 dark:bg-amber-500/10">
              <Icon
                name="folder"
                variant="round"
                className="text-base text-amber-700 dark:text-amber-300"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-default-800 text-sm font-medium dark:text-white/85">
                {project.name}
              </p>
              {project.description && (
                <p className="text-default-400 mt-0.5 truncate text-[11px] dark:text-white/40">
                  {project.description}
                </p>
              )}
              <div className="text-default-400 mt-1.5 flex items-center gap-3 text-[10px] dark:text-white/35">
                <span className="flex items-center gap-1">
                  <Icon
                    name="account_tree"
                    variant="round"
                    className="text-[10px]"
                  />
                  {t("homeScreen.workflowCount", {
                    count: project.workflowCount ?? 0,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="group" variant="round" className="text-[10px]" />
                  {t("homeScreen.memberCount", {
                    count: project.memberCount ?? 1,
                  })}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
