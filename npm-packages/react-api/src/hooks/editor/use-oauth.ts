import {
  IMCMessage,
  IMCMessageTypeEnum,
  OAuthConnectConfig,
  OAuthStatusEnum,
} from "@pulse-editor/shared-utils";
import { useEffect, useState } from "react";
import useIMC from "../imc/use-imc";
import useAppSettings from "./use-app-settings";

function generateRandomString(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hook to manage OAuth credentials for a Pulse App.
 *
 * Handles the full OAuth flow automatically:
 * - Dynamic client registration (RFC 7591) when `registrationEndpoint` is provided
 * - PKCE code challenge generation
 * - Opening the authorization modal
 * - Token exchange and storage (via the Pulse Editor backend)
 *
 * @param appId The ID of the app.
 * @param provider A provider identifier used to namespace the OAuth state.
 */
export default function useOAuth(appId: string, provider = "default") {
  const { isReady, isLoaded } = useAppSettings(appId);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();
  const { imc, isReady: isIMCReady } = useIMC(receiverHandlerMap, "oauth");

  async function checkAuthStatus() {
    if (!isIMCReady) return;
    try {
      const status = await imc?.sendMessage(
        IMCMessageTypeEnum.EditorOAuthCheckStatus,
        { appId, provider },
      );
      setIsAuthenticated(status === OAuthStatusEnum.Authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  }

  useEffect(() => {
    checkAuthStatus();
  }, [isIMCReady]);

  /**
   * Initiate the OAuth flow. The editor handles everything:
   * - Dynamic client registration (if `registrationEndpoint` is provided and `clientId` is omitted)
   * - PKCE (`codeVerifier` is auto-generated if not provided)
   * - Opening the consent modal and authorization window
   * - Token exchange and storage
   */
  async function connect(config: OAuthConnectConfig) {
    if (!isIMCReady) {
      throw new Error("IMC is not ready.");
    }

    // Auto-generate PKCE code verifier if not provided
    const resolvedConfig = { ...config };
    if (!resolvedConfig.codeVerifier) {
      resolvedConfig.codeVerifier = generateRandomString(64);
      resolvedConfig.codeChallengeMethod =
        resolvedConfig.codeChallengeMethod ?? "S256";
    }

    await imc?.sendMessage(IMCMessageTypeEnum.EditorOAuthConnect, {
      appId,
      provider,
      config: resolvedConfig,
    });
  }

  /**
   * Sign out: sends a disconnect request through the editor to remove
   * stored OAuth tokens on the backend for this provider.
   */
  async function disconnect() {
    if (!isIMCReady) {
      throw new Error("IMC is not ready.");
    }
    await imc?.sendMessage(IMCMessageTypeEnum.EditorOAuthDisconnect, {
      appId,
      provider,
    });
    setIsAuthenticated(false);
  }

  // Revalidate OAuth status when the user returns to the tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkAuthStatus();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isIMCReady]);

  return {
    isReady,
    isLoading: !isLoaded,
    isAuthenticated,
    connect,
    disconnect,
  };
}
