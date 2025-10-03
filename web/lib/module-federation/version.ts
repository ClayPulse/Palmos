import { AppConfig } from "@pulse-editor/shared-utils";
import { satisfies } from "semver";
import mfRuntime from "../../../node_modules/@module-federation/runtime/package.json";
import packageJson from "../../package.json";
import { getRemoteConfig, getRemoteManifest } from "./remote";

export async function getHostMFVersion(): Promise<string> {
  return mfRuntime.version;
}

export async function getRemoteMFVersion(
  remoteOrigin: string,
  id: string,
  version: string,
): Promise<string> {
  const mfManifest = await getRemoteManifest(remoteOrigin, id, version);
  if (!mfManifest || !mfManifest.metaData) {
    throw new Error("Remote MF manifest or metaData is undefined");
  }
  return mfManifest.metaData.pluginVersion;
}

export async function getHostLibVersion(): Promise<string> {
  const version = packageJson.dependencies[
    "@pulse-editor/shared-utils"
  ].replace("^", "");
  return version;
}

export async function getRemoteLibVersion(
  remoteOrigin: string,
  id: string,
  version: string,
): Promise<string> {
  const pulseConfig: AppConfig = await getRemoteConfig(
    remoteOrigin,
    id,
    version,
  );
  if (!pulseConfig) {
    throw new Error("Remote pulse.config.json  undefined");
  }
  const libVersion = pulseConfig.libVersion.replace("^", "");
  return libVersion;
}

export async function checkCompatibility(
  hostMFVersion: string,
  hostLibVersion: string,
  remoteMFVersion: string,
  remoteLibVersion: string,
): Promise<boolean> {
  if (remoteMFVersion === "unknown" || remoteLibVersion === "unknown") {
    console.warn("Could not determine remote versions. ");
    return false;
  }
  if (!satisfies(remoteMFVersion, hostMFVersion)) {
    console.warn(
      `Incompatible MF versions: host ${hostMFVersion}, remote ${remoteMFVersion}`,
    );
    return false;
  }
  if (!satisfies(remoteLibVersion, hostLibVersion)) {
    console.warn(
      `Incompatible lib versions: host ${hostLibVersion}, remote ${remoteLibVersion}`,
    );
    return false;
  }
  return true;
}
