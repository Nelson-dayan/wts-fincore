"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <LazyMotion features={domAnimation} strict>
        <m.div
          className="flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
            <Shield className="size-6" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1">
            <m.div
              className="mx-auto h-0.5 w-16 overflow-hidden rounded-full bg-muted"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="h-full w-1/2 rounded-full bg-primary/55" />
            </m.div>
            <p className="text-[11px] font-medium text-muted-foreground">
              Redirecting…
            </p>
          </div>
        </m.div>
      </LazyMotion>
    </div>
  );
}
