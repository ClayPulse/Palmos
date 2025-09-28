import { EditorContext } from "@/components/providers/editor-context-provider";
import { registerRemotes } from "@module-federation/runtime";
import { useContext } from "react";
import { compare } from "semver";
import { getRemote, getRemoteClientBaseURL } from "../module-federation/remote";
import {
  getHostMFVersion,
  getRemoteMFVersion,
} from "../module-federation/version";
import { Extension } from "../types";

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
  ): Promise<Extension | undefined> {
    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];
    return extensions.find((ext) => ext.config.id === name) ?? undefined;
  }

  function tryAutoSetDefault(ext: Extension) {
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

  function removeDefaultExtension(ext: Extension) {
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

    const extension: Extension = {
      config: config,
      isEnabled: true,
      remoteOrigin: remoteOrigin,
      mfVersion: remoteMFVersion,
    };

    return extension;
  }

  return {
    installExtension,
    uninstallExtension,
    enableExtension,
    disableExtension,
    getInstalledExtension,
    getExtensionInfoFromRemote,
  };
}
