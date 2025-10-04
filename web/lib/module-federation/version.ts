import { AppConfig } from "@pulse-editor/shared-utils";
import { satisfies } from "semver";
import mfRuntime from "../../../node_modules/@module-federation/runtime/package.json";
import packageJson from "../../package.json";
import { getRemoteClientConfig, getRemoteClientManifest } from "./remote";

export async function getHostMFVersion(): Promise<string> {
  return mfRuntime.version;
}

export async function getRemoteMFVersion(
  remoteOrigin: string,
  id: string,
  version: string,
): Promise<string> {
  const mfManifest = await getRemoteClientManifest(remoteOrigin, id, version);
  if (!mfManifest || !mfManifest.metaData) {
    return "unknown";
  }
  return mfManifest.metaData.pluginVersion;
}

export async function getHostLibVersion(): Promise<string> {
  const version = packageJson.dependencies["@pulse-editor/shared-utils"];
  return version;
}

export async function getRemoteLibVersion(
  remoteOrigin: string,
  id: string,
  version: string,
): Promise<string> {
  const pulseConfig: AppConfig = await getRemoteClientConfig(
    remoteOrigin,
    id,
    version,
  );
  if (!pulseConfig || !pulseConfig.libVersion) {
    return "unknown";
  }
  const libVersion = pulseConfig.libVersion;
  return libVersion;
}

export async function checkCompatibility(
  hostVersion: string,
  remoteVersion: string,
): Promise<boolean> {
  if (remoteVersion === "unknown") {
    console.warn("Could not determine remote versions. ");
    return false;
  }
  if (!satisfies(remoteVersion, hostVersion)) {
    console.warn(
      `Incompatible versions: host ${hostVersion}, remote ${remoteVersion}`,
    );
    return false;
  }
  return true;
}
