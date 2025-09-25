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
