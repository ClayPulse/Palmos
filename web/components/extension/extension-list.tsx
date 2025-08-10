import { Extension } from "@/lib/types";
import Loading from "../interface/loading";
import ExtensionPreview from "./preview";
import { compare } from "semver";

export default function ExtensionList({
  extensions,
  isLoading,
  showInstalledChip,
}: {
  extensions: Extension[];
  isLoading: boolean;
  showInstalledChip: boolean;
}) {
  // Group extensions by name
  const groupedExtensions = extensions.reduce(
    (acc: Map<string, Extension[]>, ext) => {
      const key = ext.config.id;
      if (!acc.has(key)) {
        acc.set(key, []);
      }
      acc.get(key)?.push(ext);
      return acc;
    },
    new Map<string, Extension[]>(),
  );

  return (
    <>
      {isLoading ? (
        <Loading />
      ) : groupedExtensions.size === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No extensions found</p>
          <p>
            You can search for extensions in the marketplace, or import a local
            extension.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {Array.from(groupedExtensions.entries()).map(([name, extGroup]) => {
            // Take the latest version of each extension group
            const latestVersion = extGroup.reduce((latest, current) => {
              return compare(current.config.version, latest.config.version) > 0
                ? current
                : latest;
            }, extGroup[0]);

            return (
              <ExtensionPreview
                key={name}
                extension={latestVersion}
                showInstalledChip={showInstalledChip}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
