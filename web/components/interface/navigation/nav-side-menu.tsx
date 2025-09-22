import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import Explorer from "../../explorer/explorer";
import { Button } from "@heroui/react";
import Icon from "../../misc/icon";

function MenuPanel({ children }: { children?: React.ReactNode }) {
  const isLandscape = useMediaQuery({
    query: "(min-width: 768px)",
  });

  return (
    <>
      {isLandscape ? (
        <motion.div
          className="z-50 hidden h-full w-[400px] shrink-0 md:block"
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
          className="absolute z-50 h-full w-full md:hidden"
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

export default function NavSideMenu({
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
          <div className="h-full w-full min-[768px]:pl-2 min-[768px]:pr-1 min-[768px]:py-2">
            <div className="bg-content2 flex h-full w-full flex-col min-[768px]:rounded-xl shadow-md overflow-hidden">
              <div className="flex w-full items-center px-2 py-1 max-[768px]:justify-end">
                <Button
                  className="hidden max-[768px]:block"
                  onPress={() => setIsMenuOpen(false)}
                  isIconOnly
                  variant="light"
                >
                  <Icon name="close" />
                </Button>
                <Button
                  className="max-[768px]:hidden"
                  onPress={() => setIsMenuOpen(false)}
                  isIconOnly
                  variant="light"
                >
                  <Icon name="arrow_back" />
                </Button>
              </div>
              <Explorer setIsMenuOpen={setIsMenuOpen} />
            </div>
          </div>
        </MenuPanel>
      )}
    </AnimatePresence>
  );
}
