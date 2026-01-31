import { AppConfig } from "@pulse-editor/shared-utils";
import { satisfies } from "semver";
import mfRuntime from "../../../node_modules/@module-federation/runtime/package.json";
import packageJson from "../../package.json";
import {
  getDefaultRemoteOrigin,
  getRemoteClientConfig,
  getRemoteClientManifest,
} from "./remote";

export async function getHostMFVersion(): Promise<string> {
  return mfRuntime.version;
}

export async function getRemoteMFVersion(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
): Promise<string | undefined> {
  const mfManifest = await getRemoteClientManifest(id, version, remoteOrigin);
  if (!mfManifest || !mfManifest.metaData) {
    return undefined;
  }
  return mfManifest.metaData.pluginVersion;
}

export async function getHostLibVersion(): Promise<string> {
  const version = packageJson.dependencies["@pulse-editor/shared-utils"];
  return version;
}

export async function getRemoteLibVersion(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
): Promise<string | undefined> {
  const pulseConfig: AppConfig = await getRemoteClientConfig(
    id,
    version,
    remoteOrigin,
  );
  if (!pulseConfig || !pulseConfig.libVersion) {
    return undefined;
  }
  const libVersion = pulseConfig.libVersion;
  return libVersion;
}

export async function checkCompatibility(
  hostVersion: string,
  remoteVersion: string | undefined,
): Promise<boolean> {
  if (remoteVersion === undefined) {
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
