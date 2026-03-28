"use client";

import Icon from "@/components/misc/icon";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { AppModeEnum } from "@/lib/enums";
import { useExtensionAppManager } from "@/lib/hooks/use-extension-app-manager";
import { AppViewConfig } from "@/lib/types";
import { createAppViewId } from "@/lib/views/view-helpers";
import { ViewModeEnum } from "@pulse-editor/shared-utils";
import { motion } from "framer-motion";
import { useContext, useState } from "react";

export default function PulseAppView() {
  const editorContext = useContext(EditorContext);
  const { marketplaceExtensions, isLoadingMarketplaceExtensions } =
    useExtensionAppManager("All");

  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = (marketplaceExtensions ?? []).filter((ext) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      ext.config.id.toLowerCase().includes(q) ||
      ext.config.name?.toLowerCase().includes(q) ||
      ext.config.description?.toLowerCase().includes(q)
    );
  });

  function openApp(appId: string) {
    const viewId = createAppViewId(appId);
    const appConfig: AppViewConfig = { viewId, app: appId };
    editorContext?.setEditorStates((prev) => ({
      ...prev,
      appMode: AppModeEnum.Editor,
      tabViews: [
        ...prev.tabViews,
        { type: ViewModeEnum.App, config: appConfig },
      ],
      tabIndex: prev.tabViews.length,
    }));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-[#0d0d14]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-amber-200/60 bg-white px-4 py-3 dark:border-white/8 dark:bg-white/3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 p-1 dark:bg-amber-500/15">
          <img
            src="/assets/pulse-logo.svg"
            alt="Pulse"
            className="h-full w-full"
          />
        </div>
        <div>
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-300">
            Pulse App View
          </h2>
          <p className="text-xs text-gray-500 dark:text-white/50">
            Browse and launch Pulse Apps
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-amber-200/60 bg-white px-4 py-2 dark:border-white/8 dark:bg-white/3">
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-gray-50 px-3 py-1.5 dark:border-white/15 dark:bg-white/8">
          <Icon
            name="search"
            variant="round"
            className="text-sm text-amber-500/70 dark:text-amber-300/60"
          />
          <input
            className="flex-1 bg-transparent text-xs text-gray-800 outline-none placeholder-gray-400 dark:text-white dark:placeholder-white/40"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70"
            >
              <Icon name="close" variant="round" className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* App grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoadingMarketplaceExtensions ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <img
                  src="/assets/pulse-logo.svg"
                  alt="Pulse"
                  className="h-6 w-6"
                />
              </motion.div>
              <p className="text-xs text-gray-500 dark:text-white/50">
                Loading apps...
              </p>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-12">
            <Icon
              name="search_off"
              variant="round"
              className="text-3xl text-amber-400/50 dark:text-amber-500/30"
            />
            <p className="text-sm text-gray-500 dark:text-white/50">
              {searchQuery ? "No apps match your search." : "No apps available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filteredApps.map((ext) => (
              <button
                key={`${ext.config.id}:${ext.config.version}`}
                onClick={() => openApp(ext.config.id)}
                className="group flex flex-col gap-1.5 rounded-xl border border-amber-200/60 bg-white p-3 text-left shadow-sm transition-all hover:border-amber-400/60 hover:bg-amber-50 hover:shadow-[0_0_10px_rgba(245,158,11,0.12)] dark:border-white/10 dark:bg-white/6 dark:hover:border-amber-500/40 dark:hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-500/15">
                  <Icon
                    name="apps"
                    className="text-base text-amber-600/70 transition-colors group-hover:text-amber-600 dark:text-amber-400/70 dark:group-hover:text-amber-300"
                  />
                </div>
                <p className="line-clamp-1 text-xs font-semibold text-gray-800 dark:text-white/85">
                  {ext.config.name ?? ext.config.id}
                </p>
                {ext.config.description && (
                  <p className="line-clamp-2 text-[10px] leading-snug text-gray-500 dark:text-white/45">
                    {ext.config.description}
                  </p>
                )}
                <p className="mt-auto text-[10px] text-amber-600/60 dark:text-amber-400/50">
                  v{ext.config.version}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
