import { getDefaultRemoteOrigin } from "@/lib/module-federation/remote";
import { getRemoteMFVersion } from "@/lib/module-federation/version";
import { fetchAPI } from "@/lib/pulse-editor-website/backend";
import { AppMetaData, ExtensionApp } from "@/lib/types";
import useSWR from "swr";

export function useMarketplaceApps(
  category: "All" | "Published by Me",
) {
  const { data: marketplaceExtensions, isLoading } = useSWR<ExtensionApp[]>(
    category === "All" || category === "Published by Me"
      ? `/api/app/list${category === "Published by Me" ? "?published=true" : ""}`
      : null,
    async (url: string) => {
      const res = await fetchAPI(url);
      const body = await res.json();

      const fetchedExts: AppMetaData[] = body;
      try {
        const extensions: ExtensionApp[] = await Promise.all(
          fetchedExts
            .filter((extMeta) => extMeta.appConfig)
            .map(async (extMeta) => {
              // If backend does not provide mfVersion, try to load it from the manifest
              if (!extMeta.mfVersion) {
                console.warn(
                  `Server does not provide mfVersion for extension ${extMeta.name}. Trying to load from manifest...`,
                );
              }

              const origin = getDefaultRemoteOrigin();

              const mfVersion =
                extMeta.mfVersion ??
                (await getRemoteMFVersion(
                  extMeta.name,
                  extMeta.version,
                  origin,
                ));

              return {
                config: extMeta.appConfig!,
                isEnabled: true,
                remoteOrigin: origin,
                mfVersion: mfVersion,
              };
            }),
        );
        return extensions;
      } catch (error) {
        console.error("Error fetching extensions:", error);
        return [];
      }
    },
  );

  return {
    marketplaceExtensions,
    isLoading,
  };
}
