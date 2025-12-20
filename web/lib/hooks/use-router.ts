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

  return { replace, refresh };
}
