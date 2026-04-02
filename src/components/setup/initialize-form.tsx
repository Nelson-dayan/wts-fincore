"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readResponseJson } from "@/lib/http/read-response-json";

export function InitializeForm() {
  const [setupSecret, setSetupSecret] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [createSampleData, setCreateSampleData] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/setup/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupSecret,
          adminName,
          adminEmail,
          adminPassword,
          createSampleData,
        }),
      });
      const payload = await readResponseJson<{ message?: string; dbName?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Request failed");
      setMessage(`${payload.message} (database: ${payload.dbName ?? "unknown"})`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Initialization failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="setupSecret">Setup Secret</Label>
        <Input
          id="setupSecret"
          type="password"
          value={setupSecret}
          onChange={(e) => setSetupSecret(e.target.value)}
          placeholder="SETUP_SECRET"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="adminName">Admin Name</Label>
        <Input
          id="adminName"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="Admin User"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="admin@company.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="adminPassword">Admin Password</Label>
        <Input
          id="adminPassword"
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={createSampleData}
          onChange={(e) => setCreateSampleData(e.target.checked)}
        />
        Create sample data
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Initializing..." : "Initialize Database"}
      </Button>
      {message ? (
        <p className="rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
          {message}
        </p>
      ) : null}
    </form>
  );
}
