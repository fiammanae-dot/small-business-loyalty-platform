"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type MotionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function MotionReveal({ children, className, delay = 0 }: MotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStagger({ children, className, delay = 0 }: MotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({ children, className }: MotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduceMotion ? {} : { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionOnScroll({ children, className, delay = 0 }: MotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
