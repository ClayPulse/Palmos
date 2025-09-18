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
