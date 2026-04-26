"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

// Ambient Lottie rendered as the background of an agent or team card thumb.
// Sits behind the avatar, fills the container, and is intentionally
// understated (low opacity, no pointer events) so the avatar remains the
// focal point. No fallback chrome — if the source fails the slot stays
// empty and the gradient underneath shows through unchanged.
export function PreviewBackdrop({
  src,
  alt,
  opacity = 0.55,
}: {
  src: string;
  alt?: string;
  opacity?: number;
}) {
  return (
    <span
      aria-label={alt}
      aria-hidden={!alt}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity }}
    >
      <DotLottieReact
        src={src}
        loop
        autoplay
        style={{ width: "100%", height: "100%" }}
      />
    </span>
  );
}
