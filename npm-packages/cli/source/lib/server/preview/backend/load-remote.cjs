const { createInstance } = require("@module-federation/runtime");

async function loadAndCall(func, req, appId, origin, version) {
  // here we assign the return value of the init() function, which can be used to do some more complex
  // things with the module federation runtime
  const instance = createInstance({
    name: "server_function_runner",
    remotes: [
      {
        name: appId + "_server",
        entry: `${origin}/${appId}/${version}/server/remoteEntry.js`,
      },
    ],
  });

  const loadedFunc = (await instance.loadRemote(`${appId}_server/${func}`))
    .default;

  const res = await loadedFunc(req);
  return res;
}

module.exports = { loadAndCall };
