import { useMediaQuery } from "react-responsive";

export function useScreenSize() {
  const isLandscape = useMediaQuery({
    query: "(min-width: 768px)",
  });

  return { isLandscape };
}
