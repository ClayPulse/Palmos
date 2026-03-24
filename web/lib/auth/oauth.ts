import { OAuthConnectConfig, OAuthStatusEnum } from "@pulse-editor/shared-utils";
import { fetchAPI } from "../pulse-editor-website/backend";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
export const OAUTH_REDIRECT_URI = `${BACKEND_URL}/api/app/oauth/callback`;

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

export async function generateCodeChallenge(
  verifier: string,
  method: "S256" | "plain",
): Promise<string> {
  if (method === "plain") return verifier;
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Build authorization URL
// ---------------------------------------------------------------------------

export async function buildOAuthUrl(
  config: OAuthConnectConfig,
  appId?: string,
): Promise<string> {
  const url = new URL(config.authorizationUrl);
  if (!config.clientId) {
    throw new Error("clientId is required but was not resolved.");
  }
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", OAUTH_REDIRECT_URI);
  url.searchParams.set("response_type", config.responseType ?? "code");

  if (config.scope) url.searchParams.set("scope", config.scope);

  // Encode app context into state so the backend can route tokens correctly.
  const statePayload = JSON.stringify({
    appId,
    provider: config.provider,
    clientId: config.clientId,
    redirectUri: OAUTH_REDIRECT_URI,
    ...(config.state ? { appState: config.state } : {}),
    ...(config.tokenEndpoint ? { tokenEndpoint: config.tokenEndpoint } : {}),
    ...(config.codeVerifier ? { codeVerifier: config.codeVerifier } : {}),
    ...(config.clientSecret ? { clientSecret: config.clientSecret } : {}),
  });
  url.searchParams.set("state", btoa(statePayload));

  // PKCE
  if (config.codeVerifier) {
    const method = config.codeChallengeMethod ?? "S256";
    const challenge = await generateCodeChallenge(config.codeVerifier, method);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", method);
  }

  if (config.additionalParams) {
    for (const [key, value] of Object.entries(config.additionalParams)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

// ---------------------------------------------------------------------------
// Dynamic client registration (RFC 7591)
// Delegates to the backend /api/app/oauth/register endpoint.
// ---------------------------------------------------------------------------

export async function registerOAuthClient(params: {
  appId: string;
  provider: string;
  registrationEndpoint: string;
  scope?: string;
}): Promise<{ clientId: string }> {
  const res = await fetchAPI(`/api/app/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      appId: params.appId,
      provider: params.provider,
      registrationEndpoint: params.registrationEndpoint,
      scope: params.scope,
      redirectUri: OAUTH_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as any).error ?? `Client registration failed (${res.status})`,
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Token refresh
// Delegates to the backend /api/app/oauth/refresh endpoint.
// ---------------------------------------------------------------------------

export async function refreshOAuthToken(params: {
  appId: string;
  provider: string;
  tokenEndpoint: string;
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: number;
  idToken?: string;
}> {
  const res = await fetch(`${BACKEND_URL}/api/app/oauth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      appId: params.appId,
      provider: params.provider,
      tokenEndpoint: params.tokenEndpoint,
      refreshToken: params.refreshToken,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(
      (errorBody as any).error ?? `Token refresh failed (${res.status})`,
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Disconnect OAuth
// Delegates to the backend /api/app/oauth/disconnect endpoint.
// ---------------------------------------------------------------------------

export async function disconnectOAuth(params: {
  appId: string;
  provider: string;
}): Promise<void> {
  await fetchAPI(
    `/api/app/oauth/disconnect?appId=${encodeURIComponent(params.appId)}&provider=${encodeURIComponent(params.provider)}`,
    { method: "DELETE", credentials: "include" },
  );
}

// ---------------------------------------------------------------------------
// Check OAuth status
// Delegates to the backend /api/app/oauth/check endpoint.
// ---------------------------------------------------------------------------

export async function checkOAuthStatus(params: {
  appId: string;
  provider: string;
}): Promise<OAuthStatusEnum> {
  try {
    const res = await fetchAPI(
      `/api/app/oauth/check?appId=${encodeURIComponent(params.appId)}&provider=${encodeURIComponent(params.provider)}`,
      { method: "GET", credentials: "include" },
    );
    if (!res.ok) return OAuthStatusEnum.Unauthenticated;
    const { connected } = await res.json();
    return connected ? OAuthStatusEnum.Authenticated : OAuthStatusEnum.Unauthenticated;
  } catch {
    return OAuthStatusEnum.Unauthenticated;
  }
}
