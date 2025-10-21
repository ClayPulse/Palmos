import http from "http";
import pty from "node-pty";
import os from "os";
import { WebSocketServer } from "ws";

let sharedPtyProcess = null;
let sharedTerminalMode = false;

const shell = os.platform() === "win32" ? "pwsh.exe" : "bash";

const spawnShell = () => {
  return pty.spawn(shell, [], {
    name: "xterm-color",
    env: process.env,
  });
};

const setSharedTerminalMode = (useSharedTerminal) => {
  sharedTerminalMode = useSharedTerminal;
  if (sharedTerminalMode && !sharedPtyProcess) {
    sharedPtyProcess = spawnShell();
  }
};

const handleTerminalConnection = (ws) => {
  let ptyProcess = sharedTerminalMode ? sharedPtyProcess : spawnShell();

  ws.on("message", (data) => {
    const dataObj = JSON.parse(data);

    if (dataObj.type === "input") {
      const command = dataObj.payload;
      ptyProcess.write(command);
    } else if (dataObj.type === "resize") {
      const { cols, rows } = dataObj.payload;
      ptyProcess.resize(cols, rows);
    }
  });

  ptyProcess.onData((rawOutput) => {
    ws.send(JSON.stringify({ type: "output", payload: rawOutput }));
  });

  ws.on("close", () => {
    if (!sharedTerminalMode) {
      ptyProcess.kill();
    }
  });
};

/* Host ws node-pty server */
setSharedTerminalMode(false); // Set this to false to allow a shared session
const port = 6060;

export function createTerminalServer() {
  const server = http.createServer((req, res) => {});

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", handleTerminalConnection);

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  server.listen(port, () => {
    console.log(`HTTP and WebSocket server is running on port ${port}`);
  });
}
