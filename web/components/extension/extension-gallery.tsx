import { ExtensionApp } from "@/lib/types";
import { compare } from "semver";
import Loading from "../interface/loading";
import ExtensionPreview from "./extension-preview";

export default function ExtensionGallery({
  extensions,
  isLoading,
  showInstalledChip,
}: {
  extensions: ExtensionApp[];
  isLoading: boolean;
  showInstalledChip: boolean;
}) {
  // Group extensions by name
  const groupedExtensions = extensions.reduce(
    (acc: Map<string, ExtensionApp[]>, ext) => {
      const key = ext.config.id;
      if (!acc.has(key)) {
        acc.set(key, []);
      }
      acc.get(key)?.push(ext);
      return acc;
    },
    new Map<string, ExtensionApp[]>(),
  );

  const previews = Array.from(groupedExtensions.entries()).map(
    ([name, extGroup]) => {
      // Take the latest version of each extension group
      const latestVersion = extGroup.reduce((latest, current) => {
        return compare(current.config.version, latest.config.version) > 0
          ? current
          : latest;
      }, extGroup[0]);

      return (
        <div key={name} className="w-full h-fit">
          <ExtensionPreview
            extension={latestVersion}
            isShowInstalledChip={showInstalledChip}
          />
        </div>
      );
    },
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
        <div className="grid grid-cols-2 gap-2 w-full">{previews}</div>
      )}
    </>
  );
}
