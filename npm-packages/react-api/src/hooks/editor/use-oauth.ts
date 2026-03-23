import {
  IMCMessage,
  IMCMessageTypeEnum,
  OAuthConnectConfig,
} from "@pulse-editor/shared-utils";
import { useEffect } from "react";
import useIMC from "../imc/use-imc";
import useAppSettings from "./use-app-settings";

export type OAuthState = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: string | number;
  idToken?: string;
  [key: string]: any;
};

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
  const { isReady, isLoaded, settings, deleteSetting, refetch } = useAppSettings(appId);
  const keyPrefix = `oauth:${provider}:`;
  const oauthEntries = Object.entries(settings).filter(([k]) =>
    k.startsWith(keyPrefix),
  );
  const oauthRaw =
    oauthEntries.length > 0
      ? Object.fromEntries(
          oauthEntries.map(([k, v]) => [k.slice(keyPrefix.length), v]),
        )
      : null;
  const oauth =
    oauthRaw &&
    Object.values(oauthRaw).some((v) => v !== null && v !== undefined)
      ? (oauthRaw as OAuthState)
      : null;

  const receiverHandlerMap = new Map<
    IMCMessageTypeEnum,
    (senderWindow: Window, message: IMCMessage) => Promise<void>
  >();
  const { imc, isReady: isIMCReady } = useIMC(receiverHandlerMap, "oauth");

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
   * Sign out: removes all stored OAuth tokens for this provider from the
   * editor backend and resets local auth state immediately.
   */
  async function disconnect() {
    // Collect keys before deletion so we don't rely on stale `oauth`
    const keysToDelete = oauthEntries.map(([k]) => k);
    await Promise.all(keysToDelete.map((key) => deleteSetting(key)));
  }

  /**
   * Re-fetch OAuth state from app settings.
   * Call this after the user completes the OAuth flow in the external window.
   */
  async function refetchOAuth() {
    await refetch();
  }

  // Revalidate OAuth state when the user returns to the tab
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isReady]);

  /**
   * Refresh the access token using the stored refresh token.
   * The editor backend exchanges the refresh token with the OAuth provider
   * and persists the new tokens automatically.
   */
  async function refreshToken(params: {
    tokenEndpoint: string;
    clientId: string;
    clientSecret?: string;
  }): Promise<OAuthState | null> {
    if (!isIMCReady) {
      throw new Error("IMC is not ready.");
    }
    if (!oauth?.refreshToken) {
      throw new Error("No refresh token available.");
    }

    const result = await imc?.sendMessage(
      IMCMessageTypeEnum.EditorOAuthRefreshToken,
      {
        appId,
        provider,
        tokenEndpoint: params.tokenEndpoint,
        refreshToken: oauth.refreshToken,
        clientId: params.clientId,
        clientSecret: params.clientSecret,
      },
    );

    // Re-fetch settings to sync local state
    await refetchOAuth();
    return result ?? null;
  }

  return {
    isReady,
    isLoading: !isLoaded,
    oauth,
    isAuthenticated: Boolean(oauth?.accessToken),
    connect,
    disconnect,
    refetchOAuth,
    refreshToken,
  };
}
