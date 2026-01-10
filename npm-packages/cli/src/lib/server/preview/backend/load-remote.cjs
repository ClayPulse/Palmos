const {createInstance} = require('@module-federation/runtime');

async function importRemoteModule(func, appId, origin, version) {
	const instance = createInstance({
		name: 'server_function_runner',
		remotes: [
			{
				name: appId + '_server',
				entry: `${origin}/${appId}/${version}/server/remoteEntry.js`,
			},
		],
	});

	const loadedModule = await instance.loadRemote(`${appId}_server/${func}`);
	return loadedModule;
}

async function loadFunc(func, appId, origin, version) {
	// here we assign the return value of the init() function, which can be used to do some more complex
	// things with the module federation runtime
	const module = await importRemoteModule(func, appId, origin, version);
	const loadedFunc = module.default;

	return loadedFunc;
}

async function loadPrice(func, appId, origin, version) {
	const module = await importRemoteModule(func, appId, origin, version);
	const price = module._CREDIT_PER_CALL;
	return price;
}

module.exports = {loadFunc, loadPrice};
