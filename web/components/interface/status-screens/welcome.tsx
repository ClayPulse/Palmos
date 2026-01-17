import { motion } from "framer-motion";
import { useEffect } from "react";

export default function WelcomeScreen({
  setAnimationFinished,
}: {
  setAnimationFinished?: (mounted: boolean) => void;
}) {
  const animationDuration = 2; // Total animation duration in seconds

  useEffect(() => {
    const timer = setTimeout(() => {
      if (setAnimationFinished) {
        setAnimationFinished(true);
      }
    }, animationDuration * 1000);

    return () => clearTimeout(timer);
  }, [setAnimationFinished]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-y-4">
      <motion.h1
        className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 bg-[length:200%_100%] bg-clip-text text-5xl font-bold text-transparent sm:text-6xl dark:from-amber-600 dark:via-amber-300 dark:to-amber-600"
        initial={{
          opacity: 0,
          y: -20,
          backgroundPosition: "200% 50%",
        }}
        animate={{
          opacity: 1,
          y: 0,
          backgroundPosition: ["200% 50%", "0% 50%"],
        }}
        transition={{
          opacity: { duration: 0.8, ease: "easeOut" },
          y: { duration: 0.8, ease: "easeOut" },
          backgroundPosition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        Pulse Editor
      </motion.h1>

      <motion.p
        className="bg-gradient-to-r from-neutral-700 via-neutral-500 to-neutral-700 bg-[length:200%_100%] bg-clip-text px-2 text-center text-2xl text-transparent dark:from-neutral-400 dark:via-neutral-200 dark:to-neutral-400"
        initial={{
          opacity: 0,
          y: 20,
          backgroundPosition: "200% 50%",
        }}
        animate={{
          opacity: 1,
          y: 0,
          backgroundPosition: ["200% 50%", "0% 50%"],
        }}
        transition={{
          opacity: { duration: 0.8, delay: 0.2 },
          y: { duration: 0.8, delay: 0.2 },
          backgroundPosition: {
            duration: 2.5,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        Your Next AI-OS Powered by Vibe Coded Apps
      </motion.p>

      <div className="w-64 pt-4 pb-8 sm:w-96">
        <motion.div
          className="h-1 rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: animationDuration, ease: "easeInOut" }}
          style={{ transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
