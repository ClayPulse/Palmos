import ExtensionPreview from "../extension/preview";

export default function ExtensionSuggestionOverlay() {
  return (
    <div className="absolute top-0 left-0 h-full w-full backdrop-blur-xs backdrop-invert-25">
      <div className="flex h-full w-full grid-rows-[max-content_auto] flex-col items-center pb-10 pt-4">
        <div className="bg-content1 responsive-content h-20 rounded-lg"></div>
        <div className="h-full flex flex-col justify-center pb-20">
          <div className="responsive-content flex gap-2">
            <ExtensionPreview
              showInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  version: "1.0.0",
                },
                isEnabled: false,
                remoteOrigin: "https://cdn.pulse-editor.com/extension",
              }}
            />
            <ExtensionPreview
              showInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  version: "1.0.0",
                },
                isEnabled: false,
                remoteOrigin: "https://cdn.pulse-editor.com/extension",
              }}
            />
            <ExtensionPreview
              showInstalledChip
              extension={{
                config: {
                  id: "extension-id",
                  displayName: "Extension Name",
                  description: "Extension Description",
                  version: "1.0.0",
                },
                isEnabled: false,
                remoteOrigin: "https://cdn.pulse-editor.com/extension",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
