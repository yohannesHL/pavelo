"use client";

/**
 * TypingIndicator — animated dots showing agent is thinking
 */

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-2"
      role="status"
      aria-label="Xara is typing"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
    >
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-bold shadow-sm">
        X
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-[var(--color-accent)]"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
