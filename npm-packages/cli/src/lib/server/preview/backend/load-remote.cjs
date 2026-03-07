const {createInstance} = require('@module-federation/runtime');

const FETCH_PATCH_STATE_KEY = '__pulseFetchPatchState__';

function isAbsoluteUrl(url) {
	return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url);
}

function ensureFetchPatched(origin) {
	if (typeof globalThis.fetch !== 'function') {
		return;
	}

	if (!globalThis[FETCH_PATCH_STATE_KEY]) {
		const originalFetch = globalThis.fetch.bind(globalThis);
		const state = {
			baseOrigin: origin,
			originalFetch,
		};

		globalThis.fetch = (input, init) => {
			const currentBaseOrigin = state.baseOrigin;

			if (
				typeof input === 'string' &&
				currentBaseOrigin &&
				!isAbsoluteUrl(input)
			) {
				return state.originalFetch(new URL(input, currentBaseOrigin).toString(), init);
			}

			return state.originalFetch(input, init);
		};

		globalThis[FETCH_PATCH_STATE_KEY] = state;
		return;
	}

	globalThis[FETCH_PATCH_STATE_KEY].baseOrigin = origin;
}

async function importRemoteModule(func, appId, origin, version) {
	ensureFetchPatched(origin);

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
