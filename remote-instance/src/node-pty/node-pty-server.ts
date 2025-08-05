import http from "http";
import https from "https";
import { WebSocket, WebSocketServer } from "ws";
import os from "os";
import { IPty, spawn } from "node-pty";

let sharedPtyProcess: IPty | null = null;
let sharedTerminalMode = false;

const shell = os.platform() === "win32" ? "pwsh.exe" : "bash";

const spawnShell = () => {
  return spawn(shell, [], {
    name: "xterm-color",
    env: process.env,
  });
};

const setSharedTerminalMode = (useSharedTerminal: boolean) => {
  sharedTerminalMode = useSharedTerminal;
  if (sharedTerminalMode && !sharedPtyProcess) {
    sharedPtyProcess = spawnShell();
  }
};

const handleTerminalConnection = (ws: WebSocket) => {
  let ptyProcess = sharedTerminalMode ? sharedPtyProcess : spawnShell();

  ws.on("message", (command: string) => {
    const processedCommand = commandProcessor(command);
    ptyProcess?.write(processedCommand);
  });

  ptyProcess?.onData((rawOutput) => {
    const processedOutput = outputProcessor(rawOutput);
    ws.send(processedOutput);
  });

  ws.on("close", () => {
    if (!sharedTerminalMode) {
      ptyProcess?.kill();
    }
  });
};

// Utility function to process commands
const commandProcessor = (command: string) => {
  return command;
};

// Utility function to process output
const outputProcessor = (output: string) => {
  return output;
};

/* Host ws node-pty server */
setSharedTerminalMode(false); // Set this to false to allow a shared session

export function createTerminalServer(server: http.Server | https.Server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", handleTerminalConnection);

  server.on("upgrade", (request, socket, head) => {
    const { url } = request;

    // Only match URLs like /anything/terminal/ws
    const wsPathRegex = /^\/([^/]+)\/terminal\/ws$/;
    
    if (url && wsPathRegex.test(url)) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Reject unknown upgrade paths
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
    }
  });

  return server;
}
