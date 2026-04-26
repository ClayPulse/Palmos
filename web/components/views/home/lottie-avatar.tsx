"use client";

import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { useCallback, useRef, useState } from "react";

// Path to the local placeholder Lottie shown while the agent's real avatar
// is still loading from the website backend. Served from
// pulse-editor/web/public/assets/animations/.
const PLACEHOLDER_LOTTIE = "/assets/animations/Profile%20Icon.lottie";

// Renders an agent avatar.
//
// Flow:
//  1. The placeholder Lottie (a generic profile icon) starts playing
//     immediately from the local public folder — no backend round-trip.
//  2. In parallel, DotLottieReact fetches the agent's `.lottie` from
//     `/api/agent/avatar/<slug>.lottie`.
//  3. When the agent animation finishes loading, we unmount the placeholder
//     and the real avatar takes over. On parse error we drop back to the
//     placeholder so the slot is never empty.
export function LottieAvatar({
  src,
  alt,
  size = 36,
  loop = true,
  autoplay = true,
}: {
  src?: string;
  alt?: string;
  size?: number;
  // Hue + initial are accepted for backwards compatibility; the placeholder
  // is now the same Lottie for every agent so they're unused.
  hue?: number;
  initial?: string;
  loop?: boolean;
  autoplay?: boolean;
}) {
  const [realReady, setRealReady] = useState(false);
  const [realFailed, setRealFailed] = useState(false);
  const wiredRef = useRef<DotLottie | null>(null);

  const realRefCallback = useCallback((instance: DotLottie | null) => {
    if (!instance) {
      wiredRef.current = null;
      return;
    }
    if (wiredRef.current === instance) return;
    wiredRef.current = instance;
    instance.addEventListener("load", () => setRealReady(true));
    instance.addEventListener("loadError", (e: any) => {
      console.warn("[LottieAvatar] loadError", src, e);
      setRealFailed(true);
    });
  }, [src]);

  const showReal = !!src && !realFailed;
  const sharedStyle = { position: "absolute" as const, inset: 0, width: size, height: size };

  return (
    <span
      aria-label={alt}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      {/* Placeholder — shown until the real avatar reports loaded. */}
      {!realReady && (
        <DotLottieReact
          src={PLACEHOLDER_LOTTIE}
          loop
          autoplay
          style={sharedStyle}
        />
      )}
      {/* Real avatar — kept transparent until its `load` event fires so we
          don't see a flash of an empty canvas before the first frame. */}
      {showReal && (
        <DotLottieReact
          key={src}
          src={src}
          loop={loop}
          autoplay={autoplay}
          style={{ ...sharedStyle, opacity: realReady ? 1 : 0, transition: "opacity 200ms" }}
          dotLottieRefCallback={realRefCallback}
        />
      )}
    </span>
  );
}
