export async function fetchAPI(
  relativeUrl: string | URL,
  options?: RequestInit,
) {
  // The URL must be relative, starting with a "/"
  const url = getAPIUrl(relativeUrl);

  return await fetch(url, {
    credentials: "include",
    ...options,
  });
}

export function getAPIUrl(path: string | URL) {
  const relativeUrlStr = typeof path === "string" ? path : path.toString();
  if (!relativeUrlStr.startsWith("/")) {
    throw new Error("The URL must be relative, starting with a '/'");
  } else if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }
  return `${process.env.NEXT_PUBLIC_BACKEND_URL}${relativeUrlStr}`;
}
