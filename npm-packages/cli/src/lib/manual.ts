const help = `\
  help [command]  Show help for a command.
  
`;

const chat = `\
  chat [message]  (WIP) Chat with the Pulse Editor AI assistant.

                  Flags:
                    --interactive, -i
                      Start an interactive chat session

`;

const login = `\
  login           Login to the Pulse Editor Platform.

                  Flags:
                    --token [token]
                      Login using an access token. This is the default if the
                      token is set in the environment variable PE_ACCESS_TOKEN.
                    --flow
                      Login using a browser flow.

`;

const logout = `\
  logout          Logout from the Pulse Editor Platform.

`;

const publish = `\
  publish         Publish Pulse Editor Extension in current directory to the Pulse Editor Platform.
                  Flags:
                    --noBuild
                      Skip the build step before publishing.

`;

const create = `\
  create          Create a new Pulse App using the starter template.
                  Flags:
                    --framework, -f [framework]
                      The framework to use for the new app.
                      Currently available options: react.
                      Future options: vue, angular, etc.
                    --name, -n [project-name]
                      The name of the new project.
                    --visibility, -v [visibility]
                      The visibility of the new project. Options are private,
                      public, and unlisted.

`;

const preview = `\
  preview         Build the Pulse App in development mode and
                  start a preview server accessible via browser
                  with live reloading.

`;

const dev = `\
  dev             Build the Pulse App in development mode and
                  start a local development server for Pulse Editor
                  to load the app from, with live reloading.

`;

const build = `\
  build           Build the Pulse App for production deployment.
                  Flags:
                    --target, -t [target]
                      The build target. Options are 'client', 'server', or
                      unspecified (both client and server).

`;

const start = `\
  start           Build the Pulse App in production mode and
                  start a local server for Pulse Editor to load the app from.

`;

const clean = `\
  clean           Clean the dist/ directory.

`;

const upgrade = `\
  upgrade         Upgrade Pulse Editor CLI and related packages to the latest version.
                  Flags:
                    --beta
                      Upgrade to the latest beta version.

`;

export const commandsManual: Record<string, string> = {
	help,
	chat,
	login,
	logout,
	publish,
	create,
	preview,
	dev,
	build,
	start,
	clean,
	upgrade,
};
