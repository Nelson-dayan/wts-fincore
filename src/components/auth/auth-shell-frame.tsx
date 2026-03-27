"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";

export function AuthShellFrame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.22,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
