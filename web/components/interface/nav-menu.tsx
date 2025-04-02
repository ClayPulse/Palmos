import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import Explorer from "../explorer/explorer";

function MenuPanel({ children }: { children?: React.ReactNode }) {
  const isLandscape = useMediaQuery({
    query: "(min-width: 768px)",
  });

  return (
    <>
      {isLandscape ? (
        <motion.div
          className="z-30 hidden h-full w-[400px] shrink-0 md:block"
          initial={{
            x: -400,
          }}
          animate={{
            x: 0,
          }}
          exit={{
            x: -400,
          }}
          transition={{
            type: "tween",
          }}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          className="absolute z-30 h-full w-full md:hidden"
          initial={{
            y: "-100vh",
          }}
          animate={{
            y: 0,
          }}
          exit={{
            y: "-100vh",
          }}
          transition={{
            type: "tween",
          }}
        >
          {children}
        </motion.div>
      )}
    </>
  );
}

export default function NavMenu({
  isMenuOpen,
  setIsMenuOpen,
}: {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {isMenuOpen && (
        <MenuPanel>
          <Explorer setIsMenuOpen={setIsMenuOpen} />
        </MenuPanel>
      )}
    </AnimatePresence>
  );
}
