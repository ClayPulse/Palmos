import { useContext } from "react";
import { Extension } from "../types";
import { EditorContext } from "@/components/providers/editor-context-provider";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import { ExtensionConfig } from "@pulse-editor/shared-utils";
import { getRemote } from "../module-federation/remote";

export default function useExtensionManager() {
  const editorContext = useContext(EditorContext);

  async function installExtension(extension: Extension): Promise<void> {
    const remoteOrigin = extension.remoteOrigin;
    const id = extension.config.id;
    const version = extension.config.version;
    console.log("Registering remote", remoteOrigin, id, version);

    // TODO: Prevent CSS from being injected from the remote

    // Register the frontend and backend from remote
    registerRemotes(getRemote(remoteOrigin, id, version));

    // Types are not available since @module-federation/enhanced
    // cannot work in Nextjs App router. Hence types are not generated.
    const mod: any = await loadRemote(`${id}/main`);

    const { Config }: { Config: ExtensionConfig } = mod;

    const extensions = (await editorContext?.persistSettings?.extensions) ?? [];

    // Check if extension is already installed
    if (extensions.find((ext) => ext.config.id === Config.id)) {
      return;
    }

    const newExtension: Extension = {
      config: Config,
      isEnabled: true,
      remoteOrigin,
    };

    const updatedExtensions = [...extensions, newExtension];

    editorContext?.setPersistSettings((prev) => {
      return {
        ...prev,
        extensions: updatedExtensions,
      };
    });

    // Try to set default extension for file types
    tryAutoSetDefault(newExtension);
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

  async function getExtension(name: string): Promise<Extension | undefined> {
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

  return {
    installExtension,
    uninstallExtension,
    enableExtension,
    disableExtension,
    getExtension,
  };
}
