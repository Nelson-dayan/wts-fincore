"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Command, 
  X, 
  FileText, 
  Briefcase, 
  Users, 
  ShoppingCart, 
  Loader2,
  ChevronRight,
  Wallet
} from "lucide-react";
import { usePortalConfig } from "@/components/portals/portal-config-context";
import { cn } from "@/lib/utils/cn";

type SearchResult = {
  id: string;
  type: "Project" | "Invoice" | "Client" | "Purchase Order" | "Quotation" | "Expense";
  title: string;
  subtitle: string;
  url: string;
};

export function CommandPalette() {
  const router = useRouter();
  const { pathPrefix, apiPrefix } = usePortalConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle palette with CMD+K / CTRL+K or custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Fetch results
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiPrefix}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) {
          setResults(data.items || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, apiPrefix]);

  const handleSelect = useCallback((item: SearchResult) => {
    router.push(item.url);
    setIsOpen(false);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="relative flex items-center px-4 py-4 border-b border-border/40">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground"
            placeholder="Search projects, invoices, clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-border/50">
              <span className="text-[10px] font-bold text-muted-foreground">ESC</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {query.length > 0 && results.length === 0 && !loading && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          )}

          {query.length === 0 && (
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-2">Quick Navigation</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Projects", url: "/admin/projects", icon: Briefcase },
                  { label: "Invoices", url: "/admin/invoices", icon: FileText },
                  { label: "Payments", url: "/admin/payments", icon: ShoppingCart },
                  { label: "Clients", url: "/admin/clients", icon: Users },
                ].map((link) => (
                  <button
                    key={link.label}
                    onClick={() => { router.push(link.url); setIsOpen(false); }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors text-left border border-transparent hover:border-border/40"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <link.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-3">Search Results</p>
              <div className="space-y-1">
                {results.map((item, idx) => {
                  const Icon = {
                    Project: Briefcase,
                    Invoice: FileText,
                    Client: Users,
                    "Purchase Order": ShoppingCart,
                    Quotation: FileText,
                    Expense: Wallet,
                  }[item.type] || FileText;

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      className={cn(
                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left group relative",
                        idx === selectedIndex 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.01] z-10" 
                          : "hover:bg-muted/60"
                      )}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        idx === selectedIndex ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.title}</p>
                        <p className={cn(
                          "text-xs truncate",
                          idx === selectedIndex ? "text-white/70" : "text-muted-foreground"
                        )}>{item.subtitle}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
                          idx === selectedIndex ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {item.type}
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 transition-transform",
                          idx === selectedIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.5 rounded border border-border/60 bg-background font-bold">↑↓</span> to navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.5 rounded border border-border/60 bg-background font-bold">↵</span> to select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span className="font-bold">K</span> to toggle
          </div>
        </div>
      </div>

      {/* Backdrop closer */}
      <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
    </div>
  );
}
