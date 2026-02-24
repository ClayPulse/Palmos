import { fetchAPI } from "../pulse-editor-website/backend";
import { AppMetaData } from "../types";

export function getDefaultRemoteOrigin() {
  if (
    !process.env.NEXT_PUBLIC_CDN_URL ||
    !process.env.NEXT_PUBLIC_STORAGE_CONTAINER
  ) {
    throw new Error(
      "Remote origin is not specified and environment variables for CDN are not set.",
    );
  }
  return `${process.env.NEXT_PUBLIC_CDN_URL}/${process.env.NEXT_PUBLIC_STORAGE_CONTAINER}`;
}

export async function fetchLatestApp(id: string) {
  const response = await fetchAPI(
    `/api/app/get?latest=true&name=${encodeURIComponent(id)}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch latest version from registry.");
  }

  const latestVersion = (await response.json())[0] as AppMetaData;

  return latestVersion;
}

export function getRemote(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  return [
    {
      name: id,
      entry: `${remoteOrigin}/${id}/${version}/client/mf-manifest.json`,
      version: version,
    },
    {
      name: id,
      entry: `${remoteOrigin}/${id}/${version}/server/mf-manifest.json`,
      version: version,
    },
  ];
}

export function getRemoteBaseURL(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  return `${remoteOrigin}/${id}/${version}`;
}

export function getRemoteClientBaseURL(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  return `${getRemoteBaseURL(id, version, remoteOrigin)}/client`;
}

export function getRemoteServerBaseURL(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  return `${getRemoteBaseURL(id, version, remoteOrigin)}/server`;
}

export async function getRemoteClientManifest(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  const mfManifest = await fetch(
    `${getRemoteClientBaseURL(id, version, remoteOrigin)}/mf-manifest.json`,
  )
    .then((res) => res.json())
    .catch((err) => {
      console.warn("Failed to fetch remote manifest:", err);
      return null;
    });
  return mfManifest;
}

export async function getRemoteClientConfig(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  const config = fetch(
    `${getRemoteBaseURL(id, version, remoteOrigin)}/pulse.config.json`,
  )
    .then((res) => res.json())
    .catch((err) => {
      console.warn("Failed to fetch remote config:", err);
      return null;
    });
  return config;
}

async function getRemoteServerManifest(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
) {
  const mfManifest = await fetch(
    `${getRemoteServerBaseURL(id, version, remoteOrigin)}/mf-manifest.json`,
  )
    .then((res) => res.json())
    .catch((err) => {
      console.warn("Failed to fetch remote manifest:", err);
      return null;
    });
  return mfManifest;
}

export async function listRemoteServerFunctions(
  id: string,
  version: string,
  remoteOrigin: string = getDefaultRemoteOrigin(),
): Promise<string[]> {
  const mfManifest = await getRemoteServerManifest(id, version, remoteOrigin);

  console.log("Remote MF Manifest:", mfManifest);

  const exposes = mfManifest?.exposes ?? [];
  const functions = exposes.map((expose: any) => expose.name).sort();

  return functions;
}
