# Pulse CLI

## Install

```bash
$ npm install --global @pulse-editor/cli
```

## Link local development version

```bash
npm run link
```

## CLI Manual

```
  Usage
    pulse [command] [flags]

  Commands
    help [command]  Show help for a command.

    chat [message]  (WIP) Chat with the Pulse Editor AI assistant.

                    Flags:
                      --interactive, -i
                        Start an interactive chat session

    login           Login to the Pulse Editor Platform.

                    Flags:
                      --token [token]
                        Login using an access token. This is the default if the
                        token is set in the environment variable PE_ACCESS_TOKEN.
                      --flow
                        Login using a browser flow.

    logout          Logout from the Pulse Editor Platform.

    publish         Publish Pulse Editor Extension in current directory to the Pulse Editor Platform.

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
                      --path, -p [path]
                        The path where to create the new project. Defaults to the name of the project in the current working directory.

    preview         Build the Pulse App in development mode and
                    start a preview server accessible via browser
                    with live reloading.

    dev             Build the Pulse App in development mode and
                    start a local development server for Pulse Editor
                    to load the app from, with live reloading.

    build           Build the Pulse App for production deployment.
                    Flags:
                      --target, -t [target]
                        The build target. Options are 'client', 'server', or
                        unspecified (both client and server).

    start           Build the Pulse App in production mode and
                    start a local server for Pulse Editor to load the app from.

    clean           Clean the dist/ directory.


  Examples
    pulse help publish

```

## Development

```
npm run dev
```
