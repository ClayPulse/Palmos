import { CapacitorHttp } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PlatformEnum } from "../enums";
import { getPlatform } from "../platform-api/platform-checker";
import { getViewAsUserId } from "../view-as";

export async function fetchAPI(
  relativeUrl: string | URL,
  options?: RequestInit,
) {
  // The URL must be relative, starting with a "/"
  const url =
    typeof relativeUrl === "string" ? getAPIUrl(relativeUrl) : relativeUrl;

  /* 
    Use Capacitor Http plugin for native http requests.
    The native fetch will include cookies,
    and when response is processed by client,
    the cookies are set in the webview automatically.
  */
  if (getPlatform() === PlatformEnum.Capacitor) {
    // Fallback to web fetch if session is available for
    // better performance and streaming support.
    // However, do not use web fetch for session endpoint.
    if (relativeUrl.toString() !== "/api/auth/session") {
      const isLoggedInPref = await Preferences.get({
        key: "pulse-editor.is-logged-in",
      });
      const hasSession = isLoggedInPref.value === "true";
      if (hasSession) {
        return await fetch(url, {
          credentials: "include",
          ...options,
        });
      }
    }

    // attach cookie manually
    const tokenPref = await Preferences.get({
      key: "pulse-editor.session-token",
    });
    const expPref = await Preferences.get({
      key: "pulse-editor.session-expiration",
    });
    const token = tokenPref.value;
    const exp = expPref.value;

    const headers = new Headers(options?.headers ?? {});
    const capUrlPath = typeof relativeUrl === "string" ? relativeUrl : relativeUrl.pathname;
    const capSkipViewAs = capUrlPath.startsWith("/api/auth/") || capUrlPath.startsWith("/api/billing/");
    const capViewAsId = getViewAsUserId();
    if (capViewAsId && !capSkipViewAs) {
      headers.set("X-View-As-User-Id", capViewAsId);
    }
    if (token) {
      headers.append(
        "Cookie",
        `pulse-editor.session-token=${token}; Path=/; Expires=${exp}; SameSite=None; Secure; ${
          process.env.NEXT_PUBLIC_BACKEND_URL
            ? "Domain=" + new URL(process.env.NEXT_PUBLIC_BACKEND_URL).hostname
            : ""
        }`,
      );
      options = {
        ...options,
        headers,
      };
    }

    const headerObj = Object.fromEntries(headers.entries());

    const nativeResponse = await CapacitorHttp.request({
      url: url.toString(),
      method: options?.method ?? "GET",
      headers: headerObj,
      data: options?.body,
      responseType: "text", // 👈 helps handle binary/stream responses
    });

    let body: BodyInit | undefined;

    if (nativeResponse.data instanceof Blob) {
      // Handle binary/stream responses
      body = nativeResponse.data;
    } else if (typeof nativeResponse.data === "string") {
      // Regular text response
      body = nativeResponse.data;
    } else if (nativeResponse.data && typeof nativeResponse.data === "object") {
      // JSON response
      body = JSON.stringify(nativeResponse.data);
    } else if (nativeResponse.data?.stream) {
      // 👇 Handle custom stream-like responses
      const reader = nativeResponse.data.stream.getReader();
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
      });
      body = stream;
    } else {
      body = undefined;
    }

    const fetchResponse = new Response(body, {
      status: nativeResponse.status,
      headers: nativeResponse.headers,
    });
    return fetchResponse;
  }

  // Inject View-As header for admin user-switching (skip auth/billing endpoints)
  const urlPath = typeof relativeUrl === "string" ? relativeUrl : relativeUrl.pathname;
  const skipViewAs = urlPath.startsWith("/api/auth/") || urlPath.startsWith("/api/billing/");
  const viewAsId = getViewAsUserId();
  if (viewAsId && !skipViewAs) {
    const headers = new Headers(options?.headers ?? {});
    headers.set("X-View-As-User-Id", viewAsId);
    options = { ...options, headers };
  }

  return await fetch(url, {
    credentials: "include",
    ...options,
  });
}

export function getAPIUrl(path: string): URL {
  if (!path.startsWith("/")) {
    throw new Error("The URL must be relative, starting with a '/'");
  } else if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }

  return new URL(path, process.env.NEXT_PUBLIC_BACKEND_URL);
}
