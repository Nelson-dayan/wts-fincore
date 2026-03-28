import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input/90 bg-background/80 px-3.5 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-200 md:text-[0.9375rem]",
          "placeholder:text-muted-foreground/65",
          "hover:border-muted-foreground/25 hover:bg-background",
          "focus-visible:border-primary/35 focus-visible:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
