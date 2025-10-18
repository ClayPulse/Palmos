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

export const commandsManual: Record<string, string> = {
	help,
	chat,
	login,
	logout,
	publish,
	create,
};
