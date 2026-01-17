import { motion } from "framer-motion";
import { useEffect } from "react";

export default function WelcomeScreen({
  setAnimationFinished,
}: {
  setAnimationFinished?: (mounted: boolean) => void;
}) {
  const animationDuration = 2.5; // Total animation duration in seconds

  useEffect(() => {
    const timer = setTimeout(() => {
      if (setAnimationFinished) {
        setAnimationFinished(true);
      }
    }, animationDuration * 1000);

    return () => clearTimeout(timer);
  }, [setAnimationFinished]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <style jsx>{`
        @keyframes wave-shimmer {
          0% {
            background-position: -400% center;
          }
          100% {
            background-position: 400% center;
          }
        }
        .wave-text {
          background: linear-gradient(
            90deg,
            #d97706 0%,
            #f59e0b 20%,
            #fbbf24 40%,
            #fef3c7 50%,
            #fbbf24 60%,
            #f59e0b 80%,
            #d97706 100%
          );
          background-size: 400% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: wave-shimmer 4s ease-in-out infinite;
        }
      `}</style>
      <motion.h1
        className="wave-text text-6xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        Pulse Editor
      </motion.h1>
      <motion.p
        className="wave-text text-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        Your Next AI-OS Powered by Vibe Coded Apps
      </motion.p>
      <div className="mt-8 w-64">
        <motion.div
          className="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: animationDuration, ease: "easeInOut" }}
          style={{ transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
