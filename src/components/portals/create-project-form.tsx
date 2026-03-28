"use client";

import { useEffect, useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

interface ClientOption {
  _id: string;
  name: string;
  company?: string;
}
interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export function CreateProjectForm({
  prefillClientId = "",
  defaultCollapsed = false,
}: {
  /** When set (e.g. from client view → projects), client is pre-selected in the form */
  prefillClientId?: string;
  /** When true, the form starts collapsed so the project list stays in focus */
  defaultCollapsed?: boolean;
} = {}) {
  const [showForm, setShowForm] = useState(() => !defaultCollapsed);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [status, setStatus] = useState<
    "lead" | "in_progress" | "completed" | "on_hold"
  >("lead");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setShowForm(!defaultCollapsed);
  }, [defaultCollapsed]);

  useEffect(() => {
    if (!prefillClientId) return;
    let alive = true;
    async function loadClient() {
      try {
        const response = await fetch(`/api/admin/clients/${prefillClientId}/details`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          client?: { _id: string; name: string; company?: string };
          message?: string;
        };
        if (!alive || !response.ok || !payload.client) return;
        const c = payload.client;
        setClientId(String(c._id));
        setClientLabel(`${c.name}${c.company ? ` (${c.company})` : ""}`);
      } catch {
        /* ignore */
      }
    }
    loadClient();
    return () => {
      alive = false;
    };
  }, [prefillClientId]);

  useEffect(() => {
    let alive = true;
    async function loadClients() {
      const response = await fetch(
        `/api/admin/clients?page=1&limit=8&q=${encodeURIComponent(clientQuery)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as { items?: ClientOption[] };
      if (alive) setClientOptions(payload.items ?? []);
    }
    loadClients();
    return () => {
      alive = false;
    };
  }, [clientQuery]);

  useEffect(() => {
    let alive = true;
    async function loadUsers() {
      const response = await fetch("/api/admin/users?page=1&limit=50", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { users?: UserOption[] };
      if (alive) {
        const rows = payload.users ?? [];
        setUserOptions(rows);
        if (!assignedToUserId && rows[0]?._id) {
          setAssignedToUserId(rows[0]._id);
        }
      }
    }
    loadUsers();
    return () => {
      alive = false;
    };
  }, [assignedToUserId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          budget: Number(budget || 0),
          clientId,
          status,
          priority,
          assignedTo: assignedToUserId ? [assignedToUserId] : [],
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Create failed");
      setMessage("Project created. Refreshing...");
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  const collapsedLanding = defaultCollapsed && !showForm;

  return (
    <div className="mb-6">
      {collapsedLanding ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center",
            "dark:border-white/8 dark:bg-white/2"
          )}
        >
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Project list is above. Open this section only when you want to add a new project
            {prefillClientId ? " for this client" : ""}.
          </p>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => setShowForm(true)}
          >
            <FolderPlus className="size-4" aria-hidden />
            Create new project
          </Button>
        </div>
      ) : (
        <Card className="border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px]">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                <FolderPlus className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Create project</CardTitle>
                <CardDescription className="mt-1 text-[0.8125rem]">
                  {prefillClientId
                    ? "Client is pre-selected from the page you came from. You can change it below."
                    : "Link a client and assign teammates."}
                </CardDescription>
              </div>
            </div>
            {defaultCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-muted-foreground"
                onClick={() => setShowForm(false)}
              >
                Hide form
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-budget">Budget</Label>
                <Input
                  id="project-budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-status">Status</Label>
                <Select
                  id="project-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "lead" | "in_progress" | "completed" | "on_hold"
                    )
                  }
                  options={[
                    { value: "lead", label: "lead" },
                    { value: "in_progress", label: "in_progress" },
                    { value: "completed", label: "completed" },
                    { value: "on_hold", label: "on_hold" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-priority">Priority</Label>
                <Select
                  id="project-priority"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "low" | "medium" | "high")
                  }
                  options={[
                    { value: "low", label: "low" },
                    { value: "medium", label: "medium" },
                    { value: "high", label: "high" },
                  ]}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-assigned">Assigned To</Label>
                <Select
                  id="project-assigned"
                  value={assignedToUserId}
                  onChange={(e) => setAssignedToUserId(e.target.value)}
                  options={
                    userOptions.length
                      ? userOptions.map((user) => ({
                          value: user._id,
                          label: `${user.name} (${user.email})`,
                        }))
                      : [{ value: "", label: "No users found" }]
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-description">Description</Label>
                <Input
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="project-client-search">Search Client</Label>
                <Input
                  id="project-client-search"
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                  placeholder="Type client name, company, or email"
                />
                <div className="rounded-xl border border-border/70 bg-muted/25 p-3 dark:bg-muted/15">
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-background/80 px-3 py-2 text-xs ring-1 ring-border/50">
                    <span className="text-muted-foreground">Selected client</span>
                    <span className="font-medium text-foreground">{clientLabel || "None"}</span>
                    {clientId ? (
                      <button
                        type="button"
                        className="ml-auto text-primary hover:underline"
                        onClick={() => {
                          setClientId("");
                          setClientLabel("");
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background">
                    {clientOptions.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted-foreground">No clients found.</p>
                    ) : (
                      clientOptions.map((client) => (
                        <button
                          key={client._id}
                          type="button"
                          className="block w-full border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/60"
                          onClick={() => {
                            setClientId(client._id);
                            setClientLabel(
                              `${client.name}${client.company ? ` (${client.company})` : ""}`
                            );
                          }}
                        >
                          {client.name}
                          {client.company ? (
                            <span className="text-muted-foreground"> ({client.company})</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Button type="submit" disabled={pending || !clientId} className="min-w-36">
                  {pending ? "Saving..." : "Create Project"}
                </Button>
                {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
