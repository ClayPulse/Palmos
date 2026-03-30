"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../misc/icon";

export default function RebrandBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !localStorage.getItem("rebrand-banner-dismissed");
  });

  const handleDismiss = () => {
    localStorage.setItem("rebrand-banner-dismissed", "true");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-50 overflow-hidden bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white"
        >
          <div className="flex items-center justify-center gap-x-2 px-4 py-2 text-center text-sm font-medium">
            <span>
              Pulse Editor is now <strong>Palmos</strong> (from the Greek
              παλμός, meaning &ldquo;pulse&rdquo;) — same heartbeat, new
              identity.
            </span>
            <button
              onClick={handleDismiss}
              className="ml-2 shrink-0 rounded-full p-0.5 transition-colors hover:bg-amber-700/50"
              aria-label="Dismiss banner"
            >
              <Icon name="close" variant="round" className="text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
