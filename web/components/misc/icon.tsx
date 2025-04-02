"use client";

import { useTheme } from "next-themes";

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
      "Icon component requires either a name or a uri prop, not both."
    );
  }

  if (name) {
    return (
      <div className="flex justify-center items-center w-full h-full">
        <span
          className={
            `material-icons${variant ? "-" + variant : ""}` +
            (className ? " " + className : "")
          }
        >
          {name}
        </span>
      </div>
    );
  }

  if (!isThemed) {
    const iconUri = uri + extension;
    return <img src={iconUri} alt="icon" className={"h-6 w-6 " + className} />;
  } else if (resolvedTheme === "dark") {
    const darkUri = uri + "-dark" + extension;
    return <img src={darkUri} alt="icon" className={"h-6 w-6 " + className} />;
  }

  const lightUri = uri + "-light" + extension;
  return <img src={lightUri} alt="icon" className={"h-6 w-6 " + className} />;
}
