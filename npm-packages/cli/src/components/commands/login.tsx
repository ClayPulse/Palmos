import { exec } from "child_process";
import http from "http";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { Result } from "meow";
import type { AddressInfo } from "net";
import os from "os";
import path from "path";
import { useEffect, useState } from "react";
import { getBackendUrl } from "../../lib/backend-url.js";
import { Flags } from "../../lib/cli-flags.js";
import {
  checkToken,
  getToken,
  isTokenInEnv,
  saveToken,
} from "../../lib/token.js";
import { Item } from "../../lib/types.js";

type LoginMethod = "token" | "flow";
type FlowState = "idle" | "opening" | "waiting" | "success" | "error";

function openBrowser(url: string) {
  const platform = process.platform;
  let cmd: string;
  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd);
}

// Render a terminal hyperlink using ANSI OSC 8 escape sequences
function TerminalLink({ url, label }: { url: string; label?: string }) {
  const text = label ?? url;
  // OSC 8 hyperlink: ESC]8;;URL BEL text ESC]8;; BEL
  const hyperlink = `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;
  return <Text>{hyperlink}</Text>;
}

export default function Login({ cli }: { cli: Result<Flags> }) {
  const [loginMethod, setLoginMethod] = useState<LoginMethod | undefined>(
    undefined,
  );

  const [isShowLoginMethod, setIsShowLoginMethod] = useState(false);
  const [isMethodSelected, setIsMethodSelected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string>("");

  const [isTokenSaved, setIsTokenSaved] = useState(false);

  const [tokenInput, setTokenInput] = useState<string>("");
  const [saveTokenInput, setSaveTokenInput] = useState<string>("");

  // Browser flow state
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [authUrl, setAuthUrl] = useState<string>("");
  const [flowError, setFlowError] = useState<string>("");

  const loginMethodItems: Item<LoginMethod>[] = [
    {
      label: "Login in browser",
      value: "flow",
    },
    {
      label: "Login using access token",
      value: "token",
    },
  ];

  const { exit } = useApp();

  // Check login method
  useEffect(() => {
    const savedToken = getToken(cli.flags.stage);
    setIsShowLoginMethod(!savedToken && !cli.flags.token && !cli.flags.flow);

    if (savedToken) {
      setLoginMethod("token");
      setToken(savedToken);
      return;
    } else if (cli.flags.token) {
      setLoginMethod("token");
    } else if (cli.flags.flow) {
      setLoginMethod("flow");
    }
  }, [cli]);

  // Check token validity
  useEffect(() => {
    // Only check token validity when it is set
    if (loginMethod === "token" && token.length > 0) {
      checkToken(token, cli.flags.stage).then((isValid) => {
        setIsAuthenticated(isValid);
        setIsCheckingAuth(false);
      });
    }
  }, [token, loginMethod]);

  useEffect(() => {
    setTimeout(() => {
      setIsMethodSelected(loginMethod !== undefined);
    }, 0);
  }, [loginMethod]);

  // Browser flow: start local server and open browser
  useEffect(() => {
    if (loginMethod !== "flow" || !isMethodSelected) return;

    const baseUrl = getBackendUrl(cli.flags.stage);

    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url ?? "/", "http://localhost");
      const receivedToken = reqUrl.searchParams.get("token");

      if (receivedToken) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          '<html><body style="font-family:sans-serif;text-align:center;padding:60px">' +
            "<h2>Login successful!</h2><p>You can close this tab and return to the terminal.</p>" +
            "</body></html>",
        );
        server.close();
        saveToken(receivedToken, cli.flags.stage);
        setToken(receivedToken);
        setFlowState("success");
        setTimeout(() => {
          exit();
        }, 1500);
      } else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Missing token parameter.");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      const callbackUrl = `http://127.0.0.1:${port}`;
      const url = `${baseUrl}/api/auth/cli?redirect=${encodeURIComponent(callbackUrl)}`;
      setAuthUrl(url);
      setFlowState("idle");
    });

    server.on("error", () => {
      setFlowError("Failed to start local server for authentication.");
      setFlowState("error");
    });

    return () => {
      server.close();
    };
  }, [loginMethod, isMethodSelected]);

  // Handle Enter key to open browser (when in flow mode and idle)
  useInput(
    (_, key) => {
      if (
        key.return &&
        loginMethod === "flow" &&
        flowState === "idle" &&
        authUrl
      ) {
        setFlowState("opening");
        openBrowser(authUrl);
        setTimeout(() => {
          setFlowState("waiting");
        }, 500);
      }
    },
    {
      isActive:
        loginMethod === "flow" && flowState === "idle" && Boolean(authUrl),
    },
  );

  return (
    <>
      {isShowLoginMethod && (
        <>
          <Text>Login to the Pulse Editor Platform</Text>
          <SelectInput
            items={loginMethodItems}
            onSelect={(item) => {
              setLoginMethod(item.value);
            }}
            isFocused={loginMethod === undefined}
          />

          <Text> </Text>
        </>
      )}

      {isMethodSelected &&
        loginMethod === "token" &&
        (token.length === 0 ? (
          <>
            <Text>Enter your Pulse Editor access token:</Text>
            <TextInput
              mask="*"
              value={tokenInput}
              onChange={setTokenInput}
              onSubmit={(value) => {
                if (value.length === 0) {
                  return;
                }

                setToken(value);
              }}
            />
          </>
        ) : isCheckingAuth ? (
          <Box>
            <Spinner type="dots" />
            <Text> Checking authentication...</Text>
          </Box>
        ) : isAuthenticated ? (
          <>
            <Text>✅ You are signed in successfully.</Text>
            {!isTokenInEnv(cli.flags.stage) &&
              getToken(cli.flags.stage) !== token && (
                <>
                  <Text>
                    🟢 It is recommended to save your access token as an
                    environment variable PE_ACCESS_TOKEN.
                  </Text>
                  <Box>
                    <Text>
                      ⚠️ (NOT recommended) Or, do you want to save access token
                      to user home directory? (y/n){" "}
                    </Text>
                    <TextInput
                      value={saveTokenInput}
                      onChange={setSaveTokenInput}
                      onSubmit={(value) => {
                        if (value.length === 0) {
                          return;
                        }

                        if (value === "y") {
                          saveToken(token, cli.flags.stage);
                          setIsTokenSaved(true);
                          setTimeout(() => {
                            exit();
                          }, 0);
                        } else {
                          exit();
                        }
                      }}
                    />
                  </Box>
                </>
              )}
            {isTokenSaved && (
              <Text>
                Token saved to {path.join(os.homedir(), ".pulse-editor")}
              </Text>
            )}
          </>
        ) : (
          <Text>Authentication error: please enter valid credentials.</Text>
        ))}

      {isMethodSelected && loginMethod === "flow" && (
        <>
          {flowState === "error" ? (
            <Text color="red">Error: {flowError}</Text>
          ) : flowState === "success" ? (
            <Text>✅ Login successful! Saving credentials...</Text>
          ) : flowState === "waiting" || flowState === "opening" ? (
            <Box flexDirection="column" gap={1}>
              <Box>
                <Spinner type="dots" />
                <Text> Waiting for browser authentication...</Text>
              </Box>
              <Text dimColor>If the browser did not open, visit: </Text>
              {authUrl && <TerminalLink url={authUrl} />}
            </Box>
          ) : authUrl ? (
            <Box flexDirection="column" gap={1}>
              <Text>
                Press <Text bold>Enter</Text> to open your browser and login:
              </Text>
              <TerminalLink url={authUrl} label="Open browser to login →" />
            </Box>
          ) : (
            <Box>
              <Spinner type="dots" />
              <Text> Preparing login...</Text>
            </Box>
          )}
        </>
      )}
    </>
  );
}
