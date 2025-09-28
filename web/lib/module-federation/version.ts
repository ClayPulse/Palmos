import mfRuntime from "../../../node_modules/@module-federation/runtime/package.json";
import { getRemoteClientBaseURL } from "./remote";

export async function getHostMFVersion(): Promise<string> {
  return mfRuntime.version;
}

export async function getRemoteMFVersion(
  remoteOrigin: string,
  id: string,
  version: string,
): Promise<string | undefined> {
  try {
    const mfManifest = await fetch(
      `${getRemoteClientBaseURL(remoteOrigin, id, version)}/mf-manifest.json`,
    );
    const mfManifestJson = await mfManifest.json();
    return mfManifestJson.metaData.pluginVersion;
  } catch (error) {
    console.warn("Error fetching remote MF version:", error);
    return undefined;
  }
}
