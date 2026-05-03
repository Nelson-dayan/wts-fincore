"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { readResponseJson } from "@/lib/http/read-response-json";

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

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [category, setCategory] = useState("");
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
    "lead" | "in_progress" | "completed" | "on_hold"
  >("lead");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadClients() {
      const response = await fetch(
        `/api/admin/clients?page=1&limit=8&q=${encodeURIComponent(clientQuery)}`,
        { cache: "no-store" }
      );
      const payload = await readResponseJson<{ items?: ClientOption[] }>(response);
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
      const payload = await readResponseJson<{ users?: UserOption[] }>(response);
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
          currency,
          category,
          clientReference,
          notes,
          startDate: startDate || undefined,
          targetEndDate: targetEndDate || undefined,
          assignedTo: assignedToUserId ? [assignedToUserId] : [],
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
    <Card className="mb-4 mt-10 border-border/80 md:mt-12">
      <CardHeader>
        <CardTitle className="text-base">Create project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex gap-2">
              <Input
                id="project-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="AED"
                className="w-24"
              />
              <Input
                id="project-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-category">Category</Label>
            <Input
              id="project-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Fixed Price, Retainer"
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
          <div className="space-y-1 sm:col-span-2">
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
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="project-client-search">Search Client</Label>
            <Input
              id="project-client-search"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              placeholder="Type client name, company, or email"
            />
            <div className="rounded-lg border border-border/70 bg-muted/20 p-2">
              <div className="mb-2 flex items-center justify-between rounded-md bg-background px-3 py-2 text-xs">
                <span className="text-muted-foreground">Selected client</span>
                <span className="font-medium text-foreground">
                  {clientLabel || "None"}
                </span>
                {clientId ? (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setClientId("");
                      setClientLabel("");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 bg-background">
                {clientOptions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No clients found.
                  </p>
                ) : (
                  clientOptions.map((client) => (
                    <button
                      key={client._id}
                      type="button"
                      className="block w-full border-b border-border/60 px-3 py-2 text-left text-sm hover:bg-muted"
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
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={pending || !clientId}>
              {pending ? "Saving..." : "Create Project"}
            </Button>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
