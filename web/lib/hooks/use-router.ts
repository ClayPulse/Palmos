export default function useRouter() {
  function replace(path: string) {
    // Check if path is relative or absolute
    if (path.startsWith("http://") || path.startsWith("https://")) {
      window.location.href = path;
      return;
    }

    // If the path is relative, use the History API to replace the current URL
    window.history.replaceState({}, "", path);
  }

  function refresh() {
    window.location.reload();
  }

  function openInNewTab(url: string) {
    window.open(url, "_blank");
  }

  function setQueryParams(params: Record<string, string>) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      searchParams.set(key, params[key]);
    }
    const newRelativePathQuery = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newRelativePathQuery);
  }

  function getQueryParams(): Record<string, string> {
    const searchParams = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  return { replace, refresh, openInNewTab, setQueryParams, getQueryParams };
}
