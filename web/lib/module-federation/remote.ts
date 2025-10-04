export function getRemote(remoteOrigin: string, id: string, version: string) {
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

export function getRemoteClientBaseURL(
  remoteOrigin: string,
  id: string,
  version: string,
) {
  return `${remoteOrigin}/${id}/${version}/client`;
}

export function getRemoteServerBaseURL(
  remoteOrigin: string,
  id: string,
  version: string,
) {
  return `${remoteOrigin}/${id}/${version}/server`;
}

export async function getRemoteClientManifest(
  remoteOrigin: string,
  id: string,
  version: string,
) {
  const mfManifest = await fetch(
    `${getRemoteClientBaseURL(remoteOrigin, id, version)}/mf-manifest.json`,
  )
    .then((res) => res.json())
    .catch((err) => {
      console.error("Failed to fetch remote manifest:", err);
      return null;
    });
  return mfManifest;
}

export function getRemoteClientConfig(
  remoteOrigin: string,
  id: string,
  version: string,
) {
  const config = fetch(
    `${getRemoteClientBaseURL(remoteOrigin, id, version)}/pulse.config.json`,
  )
    .then((res) => res.json())
    .catch((err) => {
      console.error("Failed to fetch remote config:", err);
      return null;
    });
  return config;
}
