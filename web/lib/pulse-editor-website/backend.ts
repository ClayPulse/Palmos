import { CapacitorHttp } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { PlatformEnum } from "../enums";
import { getPlatform } from "../platform-api/platform-checker";

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
    if (token) {
      headers.append(
        "Cookie",
        `pulse-editor.session-token=${token}; Path=/; Expires=${exp}; SameSite=None; Secure; ${process.env.NEXT_PUBLIC_BACKEND_URL ? "Domain=" + new URL(process.env.NEXT_PUBLIC_BACKEND_URL).hostname : ""}`,
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
    });

    console.log(
      `${url}. \n\nRequest header: ${JSON.stringify(headerObj)} \n\nNative response: ${JSON.stringify(nativeResponse)} \n\nCookie: ${document.cookie}`,
    );

    const data =
      typeof nativeResponse.data === "string"
        ? nativeResponse.data
        : JSON.stringify(nativeResponse.data);

    // Convert CapacitorHttpResponse to Fetch Response
    const fetchResponse = new Response(data, {
      status: nativeResponse.status,
      headers: nativeResponse.headers,
    });

    return fetchResponse;
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
