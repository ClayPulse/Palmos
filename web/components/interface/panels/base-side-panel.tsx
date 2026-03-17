import { useScreenSize } from "@/lib/hooks/use-screen-size";
import { AnimatePresence, motion } from "framer-motion";

type SidePanelDirection = "left" | "right";

export default function BaseSidePanel({
  isOpen,
  direction = "left",
  children,
}: {
  isOpen: boolean;
  direction?: SidePanelDirection;
  children?: React.ReactNode;
}) {
  const { isLandscape } = useScreenSize();
  const xOffset = direction === "left" ? -400 : 400;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isLandscape ? (
            <motion.div
              className="z-50 hidden h-full w-100 shrink-0 md:block"
              initial={{ x: xOffset }}
              animate={{ x: 0 }}
              exit={{ x: xOffset }}
              transition={{ type: "tween" }}
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              className="safe-area-padding absolute top-0 left-0 z-50 h-full w-full md:hidden"
              initial={{ y: "-100vh" }}
              animate={{ y: 0 }}
              exit={{ y: "-100vh" }}
              transition={{ type: "tween" }}
            >
              {children}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
