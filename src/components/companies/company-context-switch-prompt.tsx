"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, Building2, Lock, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CompanyContextSwitchPrompt({
  targetCompanyCode,
  targetCompanyName,
  targetCompanyId,
  currentCompanyCode,
  resourceName = "document",
  onSwitchSuccess,
}: {
  targetCompanyCode?: string;
  targetCompanyName?: string;
  targetCompanyId: string;
  currentCompanyCode?: string;
  resourceName?: string;
  onSwitchSuccess?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/companies/verify-company-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetCompanyId,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to authorize context switch");
      }

      localStorage.setItem("activeCompanyId", targetCompanyId);
      if (onSwitchSuccess) {
        onSwitchSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to authorize context switch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-6 min-h-[60vh]">
      <Card className="glass-card w-full max-w-lg overflow-hidden border-border/80 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="h-1 bg-linear-to-r from-amber-500 via-primary to-indigo-500" />
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shadow-xs">
              <Lock className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Company Context Switch Required
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                This {resourceName} is located under another authorized operating company scope.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-5">
          {/* Company Context Transition */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Cross-Entity Context Authorization
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-muted-foreground font-medium">Active Context</span>
                <span className="font-semibold text-xs text-foreground truncate">{currentCompanyCode || "CURRENT"}</span>
              </div>
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0 text-right">
                <span className="text-[10px] text-primary font-bold">Target Context</span>
                <span className="font-bold text-xs text-primary truncate">
                  {targetCompanyName || targetCompanyCode || "TARGET"}
                </span>
                {targetCompanyCode && (
                  <span className="text-[10px] font-mono text-primary/80">[{targetCompanyCode}]</span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSwitch} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Account Password</Label>
              <Input
                type="password"
                required
                autoFocus
                placeholder="Enter password to confirm switch"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-xs font-mono border-border/80 bg-background/50 focus:bg-background"
              />
              <p className="text-[11px] text-muted-foreground">
                Re-enter your password to switch context to {targetCompanyName || targetCompanyCode || "target company"} and view this {resourceName}.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full h-10 rounded-xl font-bold text-xs shadow-md shadow-primary/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Switching Context…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 size-4" />
                    Authorize & Switch Context
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
