import { fetchAPI } from "./backend";

export async function isAppAuthor(appId: string) {
  const response = await fetchAPI("/api/app/is-author", {
    method: "POST",
    body: JSON.stringify({
      id: appId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const {
    isAuthor,
  }: {
    isAuthor?: boolean;
  } = await response.json();

  return isAuthor ?? false;
}
