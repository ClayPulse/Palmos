import { createTerminalServer } from "./servers/node-pty";
import { createAPIServer } from "./servers/api-server";

/* Create servers */
createAPIServer().then((server) => {
  // After API server is created, the terminal server can use it
  createTerminalServer(server);
});
