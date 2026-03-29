"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ResearchOsLoadingScreenProps = {
  onComplete: () => void;
};

export function ResearchOsLoadingScreen({
  onComplete,
}: ResearchOsLoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCount((prev) => {
        if (prev >= 100) {
          window.clearInterval(id);
          return 100;
        }
        return prev + 1;
      });
    }, 25);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (count < 100) return;
    const t = window.setTimeout(() => {
      setVisible(false);
    }, 450);
    return () => window.clearTimeout(t);
  }, [count]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        onCompleteRef.current();
      }}
    >
      {visible && (
        <motion.div
          key="research-os-loader"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ y: "-100%", transition: { duration: 1, ease: [0.65, 0, 0.35, 1] } }}
        >
          <div className="text-center px-6">
            <motion.div
              className="mb-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-4"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white">
                <Layers className="h-10 w-10" strokeWidth={1.25} aria-hidden />
              </div>
              <div className="text-5xl font-light tracking-tight text-white sm:text-7xl md:text-8xl">
                Research<span className="font-semibold">OS</span>
              </div>
            </motion.div>

            <motion.div
              className="mx-auto mb-4 h-1 w-64 max-w-[85vw] overflow-hidden rounded-full bg-white/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: `${count}%` }}
                transition={{ duration: 0.08, ease: "linear" }}
              />
            </motion.div>

            <motion.div
              className="text-lg text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {count}%
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
