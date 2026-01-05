/* eslint-disable @typescript-eslint/no-explicit-any */
import {ModuleFederationPlugin} from '@module-federation/enhanced/webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import {Configuration as DevServerConfig} from 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {networkInterfaces} from 'os';
import path from 'path';
import {globSync} from 'glob';
import fs from 'fs';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ts from 'typescript';
import {pathToFileURL} from 'url';

import mfNode from '@module-federation/node';
const {NodeFederationPlugin} = mfNode;
import wp, {Configuration as WebpackConfig} from 'webpack';
const {webpack} = wp;

export async function createWebpackConfig(
	isPreview: boolean,
	buildTarget: 'client' | 'server' | 'both',
	mode: 'development' | 'production',
) {
	const projectDirName = process.cwd();

	async function loadPulseConfig() {
		// compile to js file and import
		const program = ts.createProgram({
			rootNames: [path.join(projectDirName, 'pulse.config.ts')],
			options: {
				module: ts.ModuleKind.ESNext,
				target: ts.ScriptTarget.ES2020,
				outDir: path.join(projectDirName, 'node_modules/.pulse/config'),
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
			},
		});
		program.emit();

		// Fix imports in the generated js file for all files in node_modules/.pulse/config
		globSync('node_modules/.pulse/config/**/*.js', {
			cwd: projectDirName,
			absolute: true,
		}).forEach(jsFile => {
			let content = fs.readFileSync(jsFile, 'utf-8');
			content = content.replace(
				/(from\s+["']\.\/[^\s"']+)(["'])/g,
				(match, p1, p2) => {
					// No change if the import already has any extension
					if (p1.match(/\.(js|cjs|mjs|ts|tsx|json)$/)) {
						return match; // No change needed
					}

					return `${p1}.js${p2}`;
				},
			);
			fs.writeFileSync(jsFile, content);
		});

		// Copy package.json if exists
		const pkgPath = path.join(projectDirName, 'package.json');
		if (fs.existsSync(pkgPath)) {
			const destPath = path.join(
				projectDirName,
				'node_modules/.pulse/config/package.json',
			);
			fs.copyFileSync(pkgPath, destPath);
		}

		const compiledConfig = path.join(
			projectDirName,
			'node_modules/.pulse/config/pulse.config.js',
		);
		const mod = await import(pathToFileURL(compiledConfig).href);
		// delete the compiled config after importing
		fs.rmSync(path.join(projectDirName, 'node_modules/.pulse/config'), {
			recursive: true,
			force: true,
		});
		return mod.default;
	}

	const pulseConfig = await loadPulseConfig();

	function getLocalNetworkIP() {
		const interfaces = networkInterfaces();
		for (const iface of Object.values(interfaces)) {
			if (!iface) continue;
			for (const config of iface) {
				if (config.family === 'IPv4' && !config.internal) {
					return config.address; // Returns the first non-internal IPv4 address
				}
			}
		}
		return 'localhost'; // Fallback
	}

	const origin = getLocalNetworkIP();

	const previewStartupMessage = `
🎉 Your Pulse extension preview \x1b[1m${pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030
⚡️ Network: http://${origin}:3030

✨ Try it out in your browser and let the magic happen! 🚀
`;

	const devStartupMessage = `
🎉 Your Pulse extension \x1b[1m${pulseConfig.displayName}\x1b[0m is LIVE! 

⚡️ Local: http://localhost:3030/${pulseConfig.id}/${pulseConfig.version}/
⚡️ Network: http://${origin}:3030/${pulseConfig.id}/${pulseConfig.version}/

✨ Try it out in the Pulse Editor and let the magic happen! 🚀
`;

	// #region Node Federation Plugin for Server Functions
	function makeNodeFederationPlugin() {
		function discoverServerFunctions() {
			// Get all .ts files under src/server-function and read use default exports as entry points
			const files = globSync('./src/server-function/**/*.ts');
			const entryPoints = files
				.map(file => file.replaceAll('\\', '/'))
				.map(file => {
					return {
						['./' +
						file.replace('src/server-function/', '').replace(/\.ts$/, '')]:
							'./' + file,
					};
				})
				.reduce((acc, curr) => {
					return {...acc, ...curr};
				}, {});

			return entryPoints;
		}

		const funcs = discoverServerFunctions();

		console.log(`Discovered server functions:
${Object.entries(funcs)
	.map(([name, file]) => {
		return `  - ${name.slice(2)} (from ${file})`;
	})
	.join('\n')}
`);

		return new NodeFederationPlugin(
			{
				name: pulseConfig.id + '_server',
				remoteType: 'script',
				useRuntimePlugin: true,
				library: {type: 'commonjs-module'},
				filename: 'remoteEntry.js',
				exposes: {
					...funcs,
				},
			} as any,
			{},
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function compileServerFunctions(compiler: any) {
		// Remove existing entry points
		try {
			fs.rmSync('dist/server', {recursive: true, force: true});
		} catch (e) {
			console.error('Error removing dist/server:', e);
			console.log('Continuing...');
		}

		// Run a new webpack compilation to pick up new server functions
		const options = {
			...compiler.options,
			watch: false,
			plugins: [
				// Add a new NodeFederationPlugin with updated entry points
				makeNodeFederationPlugin(),
			],
		};
		const newCompiler = webpack(options);

		// Run the new compiler
		newCompiler?.run((err, stats) => {
			if (err) {
				console.error(`[Server] ❌ Error during recompilation:`, err);
			} else if (stats?.hasErrors()) {
				console.error(`[Server] ❌ Compilation errors:`, stats.toJson().errors);
			} else {
				console.log(`[Server] ✅ Compiled server functions successfully.`);
			}
		});
	}
	// #endregion

	// #region Source file parser for Pulse Config plugin
	class PulseConfigPlugin {
		private requireFS = false;

		apply(compiler: any) {
			compiler.hooks.beforeCompile.tap('PulseConfigPlugin', () => {
				this.requireFS = false;

				globSync(['src/**/*.tsx', 'src/**/*.ts']).forEach(file => {
					const source = fs.readFileSync(file, 'utf8');
					this.scanSource(source);
				});

				// Persist result
				pulseConfig.requireWorkspace = this.requireFS;
			});
		}

		private isWorkspaceHook(node: ts.Node): boolean {
			return (
				ts.isCallExpression(node) &&
				ts.isIdentifier(node.expression) &&
				[
					'useFileSystem',
					'useFile',
					'useReceiveFile',
					'useTerminal',
					'useWorkspaceInfo',
				].includes(node.expression.text)
			);
		}

		private scanSource(sourceText: string) {
			const sourceFile = ts.createSourceFile(
				'temp.tsx',
				sourceText,
				ts.ScriptTarget.Latest,
				true,
			);

			const visit = (node: ts.Node) => {
				// Detect: useFileSystem(...)
				if (this.isWorkspaceHook(node)) {
					this.requireFS = true;
				}

				ts.forEachChild(node, visit);
			};

			visit(sourceFile);
		}
	}

	// #endregion

	// #region Webpack Configs
	const previewClientConfig: WebpackConfig & DevServerConfig = {
		mode: mode,
		entry: {
			main: './node_modules/.pulse/server/preview/frontend/index.js',
		},
		output: {
			path: path.resolve(projectDirName, 'dist/client'),
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js'],
		},
		plugins: [
			new PulseConfigPlugin(),
			new HtmlWebpackPlugin({
				template: './node_modules/.pulse/server/preview/frontend/index.html',
			}),
			new MiniCssExtractPlugin({
				filename: 'globals.css',
			}),
			new CopyWebpackPlugin({
				patterns: [{from: 'src/assets', to: 'assets'}],
			}),
			{
				apply: compiler => {
					let isFirstRun = true;

					// Before build starts
					compiler.hooks.watchRun.tap('ReloadMessagePlugin', () => {
						if (!isFirstRun) {
							console.log('[client-preview] 🔄 Reloading app...');
						} else {
							console.log('[client-preview] 🔄 Building app...');
						}
					});

					// After build finishes
					compiler.hooks.done.tap('ReloadMessagePlugin', () => {
						if (isFirstRun) {
							console.log('[client-preview] ✅ Successfully built preview.');
							console.log(previewStartupMessage);
							isFirstRun = false;
						} else {
							console.log('[client-preview] ✅ Reload finished');
						}

						// Write pulse config to dist
						fs.writeFileSync(
							path.resolve(projectDirName, 'dist/client/pulse.config.json'),
							JSON.stringify(pulseConfig, null, 2),
						);
						fs.writeFileSync(
							path.resolve(projectDirName, 'dist/server/pulse.config.json'),
							JSON.stringify(pulseConfig, null, 2),
						);
					});
				},
			},
		],
		watchOptions: {
			ignored: /src\/server-function/,
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: [/node_modules/, /dist/],
				},
				{
					test: /\.css$/i,
					use: [
						MiniCssExtractPlugin.loader,
						'css-loader',
						{
							loader: 'postcss-loader',
						},
					],
				},
			],
		},
		stats: {
			all: false,
			errors: true,
			warnings: true,
			logging: 'warn',
			colors: true,
		},
		infrastructureLogging: {
			level: 'warn',
		},
	};

	const mfClientConfig: WebpackConfig & DevServerConfig = {
		mode: mode,
		name: 'client',
		entry: './src/main.tsx',
		output: {
			publicPath: 'auto',
			path: path.resolve(projectDirName, 'dist/client'),
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js'],
		},
		plugins: [
			new PulseConfigPlugin(),
			new MiniCssExtractPlugin({
				filename: 'globals.css',
			}),
			// Copy assets to dist
			new CopyWebpackPlugin({
				patterns: [{from: 'src/assets', to: 'assets'}],
			}),
			new ModuleFederationPlugin({
				// Do not use hyphen character '-' in the name
				name: pulseConfig.id,
				filename: 'remoteEntry.js',
				exposes: {
					'./main': './src/main.tsx',
				},
				shared: {
					react: {
						requiredVersion: '19.2.0',
						import: 'react', // the "react" package will be used a provided and fallback module
						shareKey: 'react', // under this name the shared module will be placed in the share scope
						shareScope: 'default', // share scope with this name will be used
						singleton: true, // only a single version of the shared module is allowed
					},
					'react-dom': {
						requiredVersion: '19.2.0',
						singleton: true, // only a single version of the shared module is allowed
					},
				},
			}),
			{
				apply: compiler => {
					if (compiler.options.mode === 'development') {
						let isFirstRun = true;

						// Before build starts
						compiler.hooks.watchRun.tap('ReloadMessagePlugin', () => {
							if (!isFirstRun) {
								console.log('[client] 🔄 reloading app...');
							} else {
								console.log('[client] 🔄 building app...');
							}
						});

						// Log file updates
						compiler.hooks.invalid.tap('LogFileUpdates', (file, changeTime) => {
							console.log(
								`[watch] change detected in: ${file} at ${new Date(
									changeTime || Date.now(),
								).toLocaleTimeString()}`,
							);
						});

						// After build finishes
						compiler.hooks.done.tap('ReloadMessagePlugin', () => {
							if (isFirstRun) {
								console.log('[client] ✅ Successfully built client.');
								console.log(devStartupMessage);
								isFirstRun = false;
							} else {
								console.log('[client] ✅ Reload finished.');
							}

							// Write pulse config to dist
							fs.writeFileSync(
								path.resolve(projectDirName, 'dist/client/pulse.config.json'),
								JSON.stringify(pulseConfig, null, 2),
							);
						});
					} else {
						// Print build success/failed message
						compiler.hooks.done.tap('BuildMessagePlugin', stats => {
							if (stats.hasErrors()) {
								console.log(`[client] ❌ Failed to build client.`);
							} else {
								console.log(`[client] ✅ Successfully built client.`);

								// Write pulse config to dist
								fs.writeFileSync(
									path.resolve(projectDirName, 'dist/client/pulse.config.json'),
									JSON.stringify(pulseConfig, null, 2),
								);
							}
						});
					}
				},
			},
		],
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: [/node_modules/, /dist/],
				},
				{
					test: /\.css$/i,
					use: [
						MiniCssExtractPlugin.loader,
						'css-loader',
						{
							loader: 'postcss-loader',
						},
					],
					exclude: [/dist/],
				},
			],
		},

		stats: {
			all: false,
			errors: true,
			warnings: true,
			logging: 'warn',
			colors: true,
			assets: false,
		},
		infrastructureLogging: {
			level: 'warn',
		},
	};

	const mfServerConfig: WebpackConfig = {
		mode: mode,
		name: 'server',
		entry: {},
		target: 'async-node',
		output: {
			publicPath: 'auto',
			path: path.resolve(projectDirName, 'dist/server'),
		},
		resolve: {
			extensions: ['.ts', '.js'],
		},
		plugins: [
			{
				apply: compiler => {
					if (compiler.options.mode === 'development') {
						let isFirstRun = true;

						// Before build starts
						compiler.hooks.watchRun.tap('ReloadMessagePlugin', () => {
							if (!isFirstRun) {
								console.log(`[Server] 🔄 Reloading app...`);
							} else {
								console.log(`[Server] 🔄 Building app...`);
							}

							compileServerFunctions(compiler);
						});

						// After build finishes
						compiler.hooks.done.tap('ReloadMessagePlugin', () => {
							if (isFirstRun) {
								console.log(`[Server] ✅ Successfully built server.`);
								isFirstRun = false;
							} else {
								console.log(`[Server] ✅ Reload finished.`);
							}
						});

						// Watch for changes in the server-function directory to trigger rebuilds
						compiler.hooks.thisCompilation.tap(
							'WatchServerFunctions',
							compilation => {
								compilation.contextDependencies.add(
									path.resolve(projectDirName, 'src/server-function'),
								);
							},
						);
					} else {
						// Print build success/failed message
						compiler.hooks.done.tap('BuildMessagePlugin', stats => {
							if (stats.hasErrors()) {
								console.log(`[Server] ❌ Failed to build server.`);
							} else {
								compileServerFunctions(compiler);
								console.log(`[Server] ✅ Successfully built server.`);
							}
						});
					}
				},
			},
		],
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: 'ts-loader',
					exclude: [/node_modules/, /dist/],
				},
			],
		},
		stats: {
			all: false,
			errors: true,
			warnings: true,
			logging: 'warn',
			colors: true,
		},
		infrastructureLogging: {
			level: 'warn',
		},
	};
	// #endregion

	if (isPreview) {
		return [previewClientConfig, mfServerConfig];
	} else if (buildTarget === 'server') {
		return [mfServerConfig];
	} else if (buildTarget === 'client') {
		return [mfClientConfig];
	} else {
		return [mfClientConfig, mfServerConfig];
	}
}
