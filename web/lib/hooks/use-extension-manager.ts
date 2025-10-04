import { EditorContext } from "@/components/providers/editor-context-provider";
import { fetchAPI, getAPIUrl } from "@/lib/pulse-editor-website/backend";
import { registerRemotes } from "@module-federation/runtime";
import { useContext } from "react";
import toast from "react-hot-toast";
import { compare } from "semver";
import { getRemote, getRemoteClientBaseURL } from "../module-federation/remote";
import {
  getRemoteLibVersion,
  getHostMFVersion,
  getRemoteMFVersion,
} from "../module-federation/version";
import { AppMetaData, ExtensionApp } from "../types";

export default function useExtensionManager() {
  const editorContext = useContext(EditorContext);

  async function installExtension(
    remoteOrigin: string,
    id: string,
    version: string,
  ): Promise<void> {
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

    // TODO: Prevent CSS from being injected from the remote
    // Register the frontend and backend from remote
    registerRemotes(
      getRemote(
        extension.remoteOrigin,
        extension.config.id,
        extension.config.version,
      ),
    );

    const installedExtensions =
      (await editorContext?.persistSettings?.extensions) ?? [];

    // Check if extension is already installed
    if (
      installedExtensions.find((ext) => ext.config.id === extension.config.id)
    ) {
      return;
    }

    const updatedExtensions = [...installedExtensions, extension];

    editorContext?.setPersistSettings((prev) => {
      return {
        ...prev,
        extensions: updatedExtensions,
      };
    });

    // Try to set default extension for file types
    tryAutoSetDefault(extension);
  }

  async function uninstallExtension(name: string): Promise<void> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    const ext = extensions.find((ext) => ext.config.id === name);

    if (!ext) return;

    const updatedExtensions = extensions.filter(
      (ext) => ext.config.id !== name,
    );

    editorContext?.setPersistSettings((prev) => ({
      ...prev,
      extensions: updatedExtensions,
    }));

    // Remove default extension for file types
    removeDefaultExtension(ext);
  }

  async function enableExtension(name: string): Promise<void> {
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

  async function disableExtension(name: string): Promise<void> {
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

  async function getInstalledExtension(
    name: string,
  ): Promise<ExtensionApp | undefined> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    return extensions.find((ext) => ext.config.id === name) ?? undefined;
  }

  function tryAutoSetDefault(ext: ExtensionApp) {
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

  function removeDefaultExtension(ext: ExtensionApp) {
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
    // Fetch the remote to get config
    const configUrl =
      getRemoteClientBaseURL(remoteOrigin, id, version) + "/pulse.config.json";

    const config = await fetch(configUrl).then((res) => res.json());

    // Fetch the manifest to get mfVersion
    const remoteMFVersion = await getRemoteMFVersion(remoteOrigin, id, version);

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

  // Download and load the extension app from a URL if specified
  async function loadAppFromURL(urlStr: string) {
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
      remoteOrigin,
      extensionId,
      version,
    );

    const hostMFVersion = await getHostMFVersion();

    const libVersion = await getRemoteLibVersion(
      remoteOrigin,
      extensionId,
      version,
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

  // Download and load the extension app if specified
  async function loadAppFromRegistry(appId: string, inviteCode?: string) {
    const url = getAPIUrl(`/api/extension/get`);
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
      fetchedExts.map(async (extMeta) => {
        // If backend does not provide mfVersion, try to load it from the manifest
        if (!extMeta.mfVersion) {
          console.warn(
            `Server does not provide mfVersion for extension ${extMeta.name}. Trying to load from manifest...`,
          );
        }
        const mfVersion =
          extMeta.mfVersion ??
          (await getRemoteMFVersion(
            `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
            extMeta.name,
            extMeta.version,
          ));

        return {
          config: {
            id: extMeta.name,
            version: extMeta.version,
            libVersion: extMeta.libVersion,
            author: extMeta.user ? extMeta.user.name : extMeta.org.name,
            description: extMeta.description ?? "No description available",
            displayName: extMeta.displayName ?? extMeta.name,
            visibility: extMeta.visibility,
          },
          isEnabled: true,
          remoteOrigin: `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`,
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
    installExtension,
    uninstallExtension,
    enableExtension,
    disableExtension,
    getInstalledExtension,
    getExtensionInfoFromRemote,
    loadAppFromCache,
    loadAppFromRegistry,
    loadAppFromURL,
  };
}
