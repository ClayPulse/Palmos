import ExtensionPreview from "../extension/extension-preview";

export default function ExtensionSuggestionOverlay() {
  return (
    <div className="absolute top-0 left-0 h-full w-full backdrop-blur-xs backdrop-invert-25">
      <div className="flex h-full w-full grid-rows-[max-content_auto] flex-col items-center pt-4 pb-10">
        <div className="bg-content1 responsive-content h-20 rounded-lg"></div>
        <div className="flex h-full flex-col justify-center pb-20">
          <div className="responsive-content flex gap-2">
            <ExtensionPreview
              isShowInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  version: "1.0.0",
                  libVersion: "unknown",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  visibility: "public",
                },
                mfVersion: "1.0.0",
                isEnabled: false,
                remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
              }}
            />
            <ExtensionPreview
              isShowInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  version: "1.0.0",
                  libVersion: "unknown",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  visibility: "public",
                },
                mfVersion: "1.0.0",
                isEnabled: false,
                remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
              }}
            />
            <ExtensionPreview
              isShowInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  version: "1.0.0",
                  libVersion: "unknown",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  visibility: "public",
                },
                mfVersion: "1.0.0",
                isEnabled: false,
                remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
