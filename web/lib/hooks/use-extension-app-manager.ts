import { EditorContext } from "@/components/providers/editor-context-provider";
import { fetchAPI, getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { useCallback, useContext } from "react";
import toast from "react-hot-toast";
import { compare } from "semver";
import {
  getDefaultRemoteOrigin,
  getRemoteBaseURL,
} from "../module-federation/remote";
import {
  getHostMFVersion,
  getRemoteLibVersion,
  getRemoteMFVersion,
} from "../module-federation/version";
import { AppMetaData, ExtensionApp } from "../types";
import { useMarketplaceApps } from "./marketplace/use-marketplace-apps";

// Module-level cache to deduplicate concurrent loads for the same app
const inflight = new Map<string, Promise<ExtensionApp>>();

export function useExtensionAppManager(fetchCategory?: string) {
  const editorContext = useContext(EditorContext);

  const installedExtensionApps =
    editorContext?.persistSettings?.extensions?.reduceRight<ExtensionApp[]>(
      (acc, ext) => {
        if (acc.some((e) => e.config.id === ext.config.id)) return acc;
        return [ext, ...acc];
      },
      [],
    ) ?? [];

  const { marketplaceExtensions, isLoading: isLoadingMarketplaceExtensions } =
    useMarketplaceApps(
      (fetchCategory === "All" || fetchCategory === "Published by Me"
        ? fetchCategory
        : "All") as "All" | "Published by Me",
    );

  const installExtensionApp = useCallback(
    async (
      remoteOrigin: string,
      id: string,
      version: string,
    ): Promise<void> => {
      // Don't install if already installed
      if (
        editorContext?.persistSettings?.extensions?.find(
          (ext) => ext.config.id === id,
        )
      ) {
        console.log(`Extension ${id} is already installed`);
        return;
      }

      const extension = await getExtensionInfoFromRemote(
        remoteOrigin,
        id,
        version,
      );

      console.log("Installing remote", extension);

      const remoteMFVersion = extension.mfVersion;

      const hostMFVersion = await getHostMFVersion();

      if (!remoteMFVersion) {
        throw new Error("Remote MF version is undefined");
      } else if (compare(remoteMFVersion, hostMFVersion) !== 0) {
        throw new Error(
          `Extension MF version ${remoteMFVersion} is not compatible with host MF version ${hostMFVersion}`,
        );
      }

      editorContext?.setPersistSettings((prev) => {
        const exts = prev?.extensions ?? [];
        // Deduplicate all existing extensions by id (keep first seen), then add the new one
        const deduped = exts.reduceRight<ExtensionApp[]>((acc, ext) => {
          if (
            ext.config.id === id ||
            acc.some((e) => e.config.id === ext.config.id)
          )
            return acc;
          return [ext, ...acc];
        }, []);
        return {
          ...prev,
          extensions: [...deduped, extension],
        };
      });

      // Try to set default extension for file types
      tryAutoSetDefaultExtensionApp(extension);
    },
    [editorContext?.persistSettings?.extensions],
  );

  async function uninstallExtensionApp(id: string): Promise<void> {
    const extensions = editorContext?.persistSettings?.extensions ?? [];
    const ext = extensions.find((ext) => ext.config.id === id);

    if (!ext) return;

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      extensions: (prev?.extensions ?? []).filter(
        (ext) => ext.config.id !== id,
      ),
    }));

    // Remove default extension for file types
    removeDefaultExtensionApp(ext);
  }

  async function upgradeExtensionApp(
    remoteOrigin: string,
    id: string,
    version: string,
  ): Promise<void> {
    const extension = await getExtensionInfoFromRemote(
      remoteOrigin,
      id,
      version,
    );

    const remoteMFVersion = extension.mfVersion;
    const hostMFVersion = await getHostMFVersion();

    if (!remoteMFVersion) {
      throw new Error("Remote MF version is undefined");
    } else if (compare(remoteMFVersion, hostMFVersion) !== 0) {
      throw new Error(
        `Extension MF version ${remoteMFVersion} is not compatible with host MF version ${hostMFVersion}`,
      );
    }

    editorContext?.setPersistSettings((prev) => {
      const filtered = (prev?.extensions ?? []).filter(
        (ext) => ext.config.id !== id,
      );
      return {
        ...prev,
        extensions: [...filtered, extension],
      };
    });

    tryAutoSetDefaultExtensionApp(extension);
  }

  async function enableExtensionApp(name: string): Promise<void> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    const newExtensions = extensions.map((ext) => {
      if (ext.config.id === name) {
        ext.isEnabled = true;
      }
      return ext;
    });

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      extensions: newExtensions,
    }));
  }

  async function disableExtensionApp(name: string): Promise<void> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    const newExtensions = extensions.map((ext) => {
      if (ext.config.id === name) {
        ext.isEnabled = false;
      }
      return ext;
    });

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      extensions: newExtensions,
    }));
  }

  async function getInstalledExtensionApp(
    name: string,
  ): Promise<ExtensionApp | undefined> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    return extensions.find((ext) => ext.config.id === name) ?? undefined;
  }

  function tryAutoSetDefaultExtensionApp(ext: ExtensionApp) {
    // Try to set default extension for file types
    const map =
      editorContext?.persistSettings?.defaultFileTypeExtensionMap ?? {};
    if (map) {
      ext.config.fileTypes?.forEach((fileType) => {
        if (map[fileType]) return;

        map[fileType] = ext;
      });
    }

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      defaultFileTypeExtensionMap: map,
    }));
  }

  function removeDefaultExtensionApp(ext: ExtensionApp) {
    const map = editorContext?.persistSettings?.defaultFileTypeExtensionMap;
    if (map) {
      ext.config.fileTypes?.forEach((fileType) => {
        delete map[fileType];
      });
    }

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      defaultFileTypeExtensionMap: map,
    }));
  }

  async function getExtensionInfoFromRemote(
    remoteOrigin: string,
    id: string,
    version: string,
  ) {
    const cacheKey = `remote:${remoteOrigin}:${id}:${version}`;
    const existing = inflight.get(cacheKey);
    if (existing) return existing;

    const promise = _getExtensionInfoFromRemote(remoteOrigin, id, version);
    inflight.set(cacheKey, promise);
    promise.finally(() => inflight.delete(cacheKey));
    return promise;
  }

  async function _getExtensionInfoFromRemote(
    remoteOrigin: string,
    id: string,
    version: string,
  ) {
    // Fetch the remote to get config
    const configUrl =
      getRemoteBaseURL(id, version, remoteOrigin) + "/pulse.config.json";

    const config = await fetch(configUrl).then((res) => res.json());

    // Fetch the manifest to get mfVersion
    const remoteMFVersion = await getRemoteMFVersion(id, version, remoteOrigin);

    console.log("Fetched remote config", config);

    if (!config) {
      throw new Error("Failed to fetch extension config");
    }

    const extension: ExtensionApp = {
      config: config,
      isEnabled: true,
      remoteOrigin: remoteOrigin,
      mfVersion: remoteMFVersion,
    };

    return extension;
  }

  // Download and load the extension app from a URL if specified (with dedup)
  async function loadAppFromURL(urlStr: string) {
    const cacheKey = `url:${urlStr}`;
    const existing = inflight.get(cacheKey);
    if (existing) return existing;

    const promise = _loadAppFromURL(urlStr);
    inflight.set(cacheKey, promise as Promise<ExtensionApp>);
    promise.finally(() => inflight.delete(cacheKey));
    return promise;
  }

  async function _loadAppFromURL(urlStr: string) {
    // the url is expected to be in the format of {remoteOrigin}/{extensionId}/{version}

    const url = new URL(urlStr);
    const parts = url.pathname.split("/").filter((part) => part.length > 0);
    if (parts.length < 2) {
      console.error("Invalid app URL format");
      return undefined;
    }
    const extensionId = parts[parts.length - 2];
    const version = parts[parts.length - 1];
    // Remote origin is everything before the last two parts
    const remoteOrigin = url.origin + parts.slice(0, -2).join("/");

    const remoteMFVersion = await getRemoteMFVersion(
      extensionId,
      version,
      remoteOrigin,
    );

    const hostMFVersion = await getHostMFVersion();

    const libVersion = await getRemoteLibVersion(
      extensionId,
      version,
      remoteOrigin,
    );

    if (remoteMFVersion !== hostMFVersion) {
      const errorMsg = `Extension MF version (${remoteMFVersion}) does not match host MF version (${hostMFVersion}). Please install a compatible version.`;
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    const ext: ExtensionApp = {
      config: {
        id: extensionId,
        version: version,
        libVersion,
        author: "Unknown",
        description: "No description available",
        displayName: extensionId,
        visibility: "private",
      },
      isEnabled: true,
      remoteOrigin: remoteOrigin,
      mfVersion: remoteMFVersion,
    };

    return ext;
  }

  // Download and load the extension app if specified (with dedup)
  async function loadAppFromRegistry(appId: string, inviteCode?: string) {
    const cacheKey = `registry:${appId}:${inviteCode ?? ""}`;
    const existing = inflight.get(cacheKey);
    if (existing) return existing;

    const promise = _loadAppFromRegistry(appId, inviteCode);
    inflight.set(cacheKey, promise);
    promise.finally(() => inflight.delete(cacheKey));
    return promise;
  }

  async function _loadAppFromRegistry(appId: string, inviteCode?: string) {
    const url = getAPIUrl(`/api/app/get`);
    url.searchParams.set("name", appId);
    url.searchParams.set("latest", "true");
    if (inviteCode) url.searchParams.set("inviteCode", inviteCode);

    const res = await fetchAPI(url);

    if (!res.ok) {
      // setNoAccessToApp(true);
      throw new Error("Not authorized to access this app", {
        cause: "not-authorized",
      });
    }

    const fetchedExts: AppMetaData[] = await res.json();

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
            (await getRemoteMFVersion(extMeta.name, extMeta.version, origin));

          return {
            config: extMeta.appConfig!,
            isEnabled: true,
            remoteOrigin: origin,
            mfVersion: mfVersion,
          };
        }),
    );

    // Get the latest version of the extension
    const ext = extensions.sort((a, b) => {
      return compare(b.config.version, a.config.version);
    })[0];

    if (!ext) {
      throw new Error("Extension not found", { cause: "not-found" });
    }

    return ext;
  }

  // Load app if already installed
  async function loadAppFromCache(appId: string) {
    const ext = editorContext?.persistSettings?.extensions?.find(
      (ext) => ext.config.id === appId,
    );

    return ext;
  }

  return {
    installedExtensionApps,
    marketplaceExtensions,
    isLoadingMarketplaceExtensions,
    installExtensionApp,
    uninstallExtensionApp,
    enableExtensionApp,
    disableExtensionApp,
    getInstalledExtensionApp,
    getExtensionInfoFromRemote,
    loadAppFromCache,
    loadAppFromRegistry,
    loadAppFromURL,
    upgradeExtensionApp,
  };
}
