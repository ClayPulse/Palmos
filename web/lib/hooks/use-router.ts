export default function useRouter() {
  function replace(path: string) {
    window.history.replaceState({}, "", path);
  }

  function refresh() {
    window.location.reload();
  }


  return { replace, refresh };
}
