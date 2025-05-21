# Pulse CLI
## Install
```bash
$ npm install --global @pulse-editor/cli
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

  Examples
    pulse help publish

```

## Development
```
npm run dev
```