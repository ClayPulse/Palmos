import http from "http";
import https from "https";
import { IPty, spawn } from "node-pty";
import os from "os";
import { WebSocket, WebSocketServer } from "ws";

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

  ws.on("message", (data: string) => {
    const dataObj = JSON.parse(data);

    if (dataObj.type === "input") {
      const command = dataObj.payload;
      ptyProcess?.write(command);
    } else if (dataObj.type === "resize") {
      const { cols, rows } = dataObj.payload;
      ptyProcess?.resize(cols, rows);
    }
  });

  ptyProcess?.onData((rawOutput) => {
    ws.send(JSON.stringify({ type: "output", payload: rawOutput }));
  });

  ws.on("close", () => {
    if (!sharedTerminalMode) {
      ptyProcess?.kill();
    }
  });
};


/* Host ws node-pty server */
setSharedTerminalMode(false); // Set this to false to allow a shared session

export function addTerminalServer(
  server: http.Server | https.Server,
  instanceId: string,
) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", handleTerminalConnection);

  server.on("upgrade", (request, socket, head) => {
    const { url } = request;

    if (!url) {
      socket.write("HTTP/1.1 400 Bad Request: Missing WebSocket URL\r\n\r\n");
      socket.destroy();
      return;
    }

    // Only match URLs like /anything/terminal/ws
    const wsPathRegex = /^\/([^/]+)\/terminal\/ws$/;
    const match = url.match(wsPathRegex);

    if (!match) {
      socket.write("HTTP/1.1 400 Bad Request: Invalid WebSocket path\r\n\r\n");
      socket.destroy();
      return;
    }

    const id = match?.[1];
    if (id !== instanceId) {
      socket.write("HTTP/1.1 400 Bad Request: Invalid instance ID\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  return server;
}
