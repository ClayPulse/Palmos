"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

export default function Icon({
  name,
  uri,
  extension = ".png",
  variant,
  className,
  isThemed,
}: {
  name?: string;
  uri?: string;
  extension?: string;
  variant?: "outlined" | "round" | "sharp" | "two-tone";
  className?: string;
  isThemed?: boolean;
}) {
  const { resolvedTheme } = useTheme();

  if (!name && !uri) {
    throw new Error("Icon component requires either a name or a uri prop.");
  }
  if (name && uri) {
    throw new Error(
      "Icon component requires either a name or a uri prop, not both.",
    );
  }

  if (name) {
    return (
      <span
        className={
          `material-icons${variant ? "-" + variant : ""}` +
          (className ? " " + className : "")
        }
      >
        {name}
      </span>
    );
  }

  if (!isThemed) {
    const iconUri = uri + extension;
    return (
      <Image
        src={iconUri}
        alt="icon"
        width={24}
        height={24}
        className={className}
      />
    );
  } else if (resolvedTheme === "dark") {
    const darkUri = uri + "-dark" + extension;
    return (
      <Image
        src={darkUri}
        alt="icon"
        width={24}
        height={24}
        className={className}
      />
    );
  }

  const lightUri = uri + "-light" + extension;
  return (
    <Image
      src={lightUri}
      alt="icon"
      width={24}
      height={24}
      className={className}
    />
  );
}
