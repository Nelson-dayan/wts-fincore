"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onChange?: (e: any) => void;
  onValueChange?: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  name?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  popoverClassName?: string;
  searchable?: boolean;
}

export function Select({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onValueChange,
  options = [],
  placeholder = "Select option...",
  disabled = false,
  name,
  id,
  className,
  buttonClassName,
  popoverClassName,
  searchable = true,
  ...props
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mounted, setMounted] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === currentValue);
  }, [options, currentValue]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate and update dynamic popover position without triggering React re-renders
  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current || !popoverRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();

    // Auto-close if trigger button is scrolled out of viewport
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(options.length * 36 + 60, 280);

    const shouldOpenUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const width = Math.max(rect.width, 100);

    const popover = popoverRef.current;
    popover.style.position = "fixed";
    popover.style.left = `${rect.left}px`;
    popover.style.width = `${width}px`;
    popover.style.zIndex = "9999";

    if (shouldOpenUp) {
      popover.style.top = "auto";
      popover.style.bottom = `${window.innerHeight - rect.top + 6}px`;
      popover.style.maxHeight = `${Math.max(spaceAbove - 16, 120)}px`;
    } else {
      popover.style.bottom = "auto";
      popover.style.top = `${rect.bottom + 6}px`;
      popover.style.maxHeight = `${Math.max(spaceBelow - 16, 120)}px`;
    }
  }, [options.length]);

  React.useEffect(() => {
    if (!isOpen) return;

    let animationFrameId: number;

    const handleScrollOrResize = (e: Event) => {
      // If scrolling inside the popover options list itself, ignore!
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        updatePosition();
      });
    };

    updatePosition();
    const timer = setTimeout(() => updatePosition(), 10);

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Handle outside clicks to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen, searchable]);

  const handleSelect = (optValue: string) => {
    if (disabled) return;
    setInternalValue(optValue);

    if (onValueChange) {
      onValueChange(optValue);
    }

    if (onChange) {
      // Create a synthetic event matching standard HTML select onChange for backwards compatibility
      const syntheticEvent = {
        target: { value: optValue, name: name || id || "" },
        currentTarget: { value: optValue, name: name || id || "" },
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent as any);
    }

    setIsOpen(false);
  };

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.value && opt.value.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const popoverContent = isOpen && (
    <div
      ref={popoverRef}
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col",
        popoverClassName
      )}
    >
      {/* Search Box (Shown if searchable and options > 5) */}
      {searchable && options.length > 5 && (
        <div className="p-2 border-b border-border/60 bg-muted/30 shrink-0">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search options..."
              className="h-8 w-full rounded-lg bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary border border-border/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="overflow-y-auto p-1 custom-scrollbar space-y-0.5 min-h-0 flex-1">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No matching options found
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/70 hover:text-foreground",
                  opt.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="truncate">
                    <div className="truncate flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <div className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                        {opt.description}
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={cn("relative w-full text-left", className)} {...props}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-input/90 bg-background/90 px-3.5 py-2 text-sm shadow-xs transition-all duration-200 cursor-pointer select-none",
          "hover:border-primary/40 hover:bg-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
          isOpen && "border-primary ring-2 ring-primary/20 bg-background shadow-sm",
          disabled && "opacity-50 cursor-not-allowed bg-muted/40",
          buttonClassName
        )}
      >
        <span className="flex items-center gap-2 truncate font-medium">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate text-foreground">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/75 truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Render popover via Portal to document.body to prevent clipping by overflow-hidden */}
      {mounted && popoverContent ? createPortal(popoverContent, document.body) : null}
    </div>
  );
}

// "Dropdown" alias for consistent naming across the app.
export const Dropdown = Select;
