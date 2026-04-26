"use client";

import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import { useCallback, useRef, useState } from "react";

// Renders an agent avatar as a Lottie animation.
//
// Flow:
//  1. Initial paint: colored disc with the agent's initial — the universal
//     loading/placeholder. The frontend never stores or fabricates static
//     per-agent avatar URLs.
//  2. DotLottieReact fetches the .lottie (ZIP) animation from the website's
//     /api/agent/avatar/<slug>.lottie route and plays it.
//  3. Once playing, the animation replaces the placeholder. On 404 / parse
//     error the placeholder stays.
export function LottieAvatar({
  src,
  alt,
  size = 36,
  hue = 220,
  initial,
  loop = true,
  autoplay = true,
}: {
  src?: string;
  alt?: string;
  size?: number;
  hue?: number;
  initial?: string;
  loop?: boolean;
  autoplay?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  // Track which instance we've already wired listeners to so we don't
  // attach duplicate handlers on every re-render.
  const wiredRef = useRef<DotLottie | null>(null);

  const dotLottieRefCallback = useCallback((instance: DotLottie | null) => {
    if (!instance) {
      wiredRef.current = null;
      return;
    }
    if (wiredRef.current === instance) return;
    wiredRef.current = instance;
    instance.addEventListener("loadError", (e: any) => {
      console.warn("[LottieAvatar] loadError", src, e);
      setFailed(true);
    });
  }, [src]);

  const showLottie = !!src && !failed;
  const letter = (initial ?? alt ?? "?").slice(0, 1).toUpperCase();

  return (
    <span
      aria-label={alt}
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `hsl(${hue} 70% 50%)`,
      }}
    >
      <span
        className="font-semibold text-white"
        style={{ fontSize: Math.max(10, Math.round(size * 0.42)) }}
      >
        {letter}
      </span>
      {showLottie && (
        <DotLottieReact
          // Keying on src ensures DotLottieReact remounts cleanly when the
          // URL changes instead of trying to swap sources on a live player.
          key={src}
          src={src}
          loop={loop}
          autoplay={autoplay}
          style={{
            position: "absolute",
            inset: 0,
            width: size,
            height: size,
          }}
          dotLottieRefCallback={dotLottieRefCallback}
        />
      )}
    </span>
  );
}
