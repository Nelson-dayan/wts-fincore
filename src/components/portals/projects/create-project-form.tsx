"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import { Search, Users, Check } from "lucide-react";

interface ClientOption {
  _id: string;
  name: string;
  company?: string;
  email?: string;
}
interface UserOption {
  _id: string;
  name: string;
  email: string;
}

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("Fixed Price");
  const [clientReference, setClientReference] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [status, setStatus] = useState<
    "active" | "completed" | "on_hold"
  >("active");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const [clientPage, setClientPage] = useState(1);
  const [hasMoreClients, setHasMoreClients] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    let alive = true;
    if (clientQuery.trim().length === 0) {
      setClientOptions([]);
      setHasMoreClients(false);
      setClientPage(1);
      return;
    }

    setLoadingClients(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/clients?page=1&limit=8&q=${encodeURIComponent(clientQuery)}`,
          { cache: "no-store" }
        );
        const payload = await readResponseJson<{ items?: ClientOption[]; hasMore?: boolean }>(response);
        if (alive) {
          setClientOptions(payload.items ?? []);
          setHasMoreClients(!!payload.hasMore);
          setClientPage(1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoadingClients(false);
      }
    }, 300);

    return () => {
      alive = false;
      clearTimeout(delayDebounce);
    };
  }, [clientQuery]);

  async function loadMoreClients() {
    if (loadingClients || !hasMoreClients) return;
    setLoadingClients(true);
    const nextPage = clientPage + 1;
    try {
      const response = await fetch(
        `/api/admin/clients?page=${nextPage}&limit=8&q=${encodeURIComponent(clientQuery)}`,
        { cache: "no-store" }
      );
      const payload = await readResponseJson<{ items?: ClientOption[]; hasMore?: boolean }>(response);
      setClientOptions((prev) => [...prev, ...(payload.items ?? [])]);
      setHasMoreClients(!!payload.hasMore);
      setClientPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClients(false);
    }
  }

  useEffect(() => {
    let alive = true;
    async function loadUsers() {
      const response = await fetch("/api/admin/users?page=1&limit=50", {
        cache: "no-store",
      });
      const payload = await readResponseJson<{ users?: UserOption[]; items?: UserOption[] }>(response);
      if (alive) {
        const rows = payload.items ?? payload.users ?? [];
        setUserOptions(rows);
      }
    }
    loadUsers();
    return () => {
      alive = false;
    };
  }, []);

  const toggleUserAssignment = (userId: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
          currency: "INR",
          category,
          clientReference,
          notes,
          startDate: startDate || undefined,
          targetEndDate: targetEndDate || undefined,
          assignedTo: assignedUserIds,
        }),
      });
      const result = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(result.message ?? "Create failed");
      setMessage("Project created. Refreshing...");
      setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="glass-card mb-4 mt-6 border border-border/70 shadow-lg transition-all duration-300 hover:shadow-xl">
      <div className="h-1 bg-linear-to-r from-primary via-indigo-500 to-sky-400" />
      <CardHeader className="pb-3 pt-6 px-6">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xs">
            <Users className="size-5.5" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Create New Project
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Define project budget, client assignment, timelines, and team permissions.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label
              htmlFor="project-client-search"
              className="text-sm font-medium"
            >
              Client
            </Label>

            <div className="rounded-2xl border border-border/60 bg-background shadow-sm">
              {/* Search Input */}
              <div className="border-b border-border/50 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    id="project-client-search"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Search by client, company, or email..."
                    className="pl-9 h-11 border-0 bg-muted/40 shadow-none focus-visible:ring-1"
                  />
                </div>
              </div>

              {/* Selected Client */}
              <div className="border-b border-border/50 px-3 py-3">
                {clientId ? (
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {clientLabel?.charAt(0)}
                      </div>

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {clientLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Selected client
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
                      onClick={() => {
                        setClientId("");
                        setClientLabel("");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 py-6 text-sm text-muted-foreground">
                    No client selected
                  </div>
                )}
              </div>

              {/* Client List */}
              <div className="max-h-72 overflow-y-auto p-2">
                {loadingClients && clientOptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="mt-2 text-sm text-muted-foreground">Searching clients...</p>
                  </div>
                ) : clientQuery.trim().length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      Type to search clients
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Search by client name, company, or email
                    </p>
                  </div>
                ) : clientOptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      No clients found
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Try searching with another keyword
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {clientOptions.map((client) => {
                      const isSelected = clientId === client._id;
                      return (
                        <button
                          key={client._id}
                          type="button"
                          onClick={() => {
                            setClientId(client._id);
                            setClientLabel(
                              `${client.name}${client.company
                                ? ` (${client.company})`
                                : ""
                              }`
                            );
                          }}
                          className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all
                            ${isSelected
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold
                                  ${isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-primary/10 text-primary"
                                }
                              `}
                            >
                              {client.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {client.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs opacity-80">
                                {client.company && (
                                  <span>{client.company}</span>
                                )}
                                {client.email && (
                                  <>
                                    <span>•</span>
                                    <span>{client.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                      );
                    })}

                    {hasMoreClients && (
                      <div className="pt-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={loadMoreClients}
                          disabled={loadingClients}
                          className="w-full text-xs font-semibold text-primary py-2 h-auto hover:bg-primary/5"
                        >
                          {loadingClients ? "Loading..." : "Load More Clients"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-budget">Budget</Label>
            <Input
              id="project-budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-category">Category</Label>
            <Select
              id="project-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "Fixed Price", label: "Fixed Price" },
                { value: "Retainer", label: "Retainer" },
                { value: "Time & Materials", label: "Time & Materials" },
                { value: "Other", label: "Other" },
              ]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-client-ref">Client Reference / PO</Label>
            <Input
              id="project-client-ref"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-status">Status</Label>
            <Select
              id="project-status"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "active" | "completed" | "on_hold"
                )
              }
              options={[
                { value: "active", label: "active" },
                { value: "completed", label: "completed" },
                { value: "on_hold", label: "on_hold" },
              ]}
            />
          </div>
          <div className="space-y-1">
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
          <div className="space-y-1">
            <Label htmlFor="project-start-date">Start Date</Label>
            <Input
              id="project-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-target-date">Target End Date</Label>
            <Input
              id="project-target-date"
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-sm font-medium">Assigned Team Members</Label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              {userOptions.length === 0 ? (
                <span className="text-xs text-muted-foreground">Loading employees...</span>
              ) : (
                userOptions.map((user) => {
                  const isSelected = assignedUserIds.includes(user._id);
                  return (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => toggleUserAssignment(user._id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      {user.name} ({user.email})
                      {isSelected && <Check className="ml-1 h-3.5 w-3.5" />}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Selected employees will be automatically assigned with initial Finance Contributor permissions. You can customize per-module permissions in project details.
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="project-description">Description</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="project-notes">Internal Notes</Label>
            <Input
              id="project-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about the project..."
            />
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
            {message ? <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</p> : null}
            <Button
              type="submit"
              disabled={pending || !clientId}
              className="h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
            >
              {pending ? "Creating Project…" : "Create Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
