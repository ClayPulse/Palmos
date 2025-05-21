import { Extension } from "@/lib/types";
import Loading from "../interface/loading";
import ExtensionPreview from "./preview";

export default function ExtensionList({
  extensions,
  isLoading,
  showInstalledChip,
}: {
  extensions: Extension[];
  isLoading: boolean;
  showInstalledChip: boolean;
}) {
  return (
    <>
      {isLoading ? (
        <Loading />
      ) : extensions.length === 0 ? (
        <div className="w-full space-y-2">
          <p className="text-center text-lg">No extensions found</p>
          <p>
            You can search for extensions in the marketplace, or import a local
            extension.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1">
          {extensions.map((ext) => (
            <ExtensionPreview
              extension={ext}
              key={ext.config.id + ext.config.version}
              showInstalledChip={showInstalledChip}
            />
          ))}
        </div>
      )}
    </>
  );
}
