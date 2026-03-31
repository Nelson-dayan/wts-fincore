import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const normalizedProps =
      "value" in props && type !== "file"
        ? { ...props, value: (props.value as string | number | readonly string[] | undefined) ?? "" }
        : props;
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background/60 px-3.5 py-2 text-base shadow-sm transition-all duration-200",
          "placeholder:text-muted-foreground/75",
          "hover:border-border focus:border-ring/60 focus:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...normalizedProps}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
