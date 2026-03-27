"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type ClientRow = {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  clientLogoText?: string;
  clientSignatureText?: string;
  projectsCount?: number;
  createdAt: string;
};

export function AdminClientsClient() {
  const [items, setItems] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState("");
  const limit = 10;

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    clientLogoText: "",
    clientSignatureText: "",
  });
  const [drafts, setDrafts] = useState<Record<string, Partial<ClientRow>>>({});

  async function fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function loadClients(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      const response = await fetch(`/api/admin/clients?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        items?: ClientRow[];
        total?: number;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "Failed to load clients");
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingId("create");
    setError("");
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to create client");
      setForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        website: "",
        address: "",
        clientLogoText: "",
        clientSignatureText: "",
      });
      await loadClients(1, query);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create client");
    } finally {
      setSavingId("");
    }
  }

  async function saveClient(clientId: string) {
    const draft = drafts[clientId];
    if (!draft) return;
    setSavingId(clientId);
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          company: draft.company,
          email: draft.email,
          phone: draft.phone,
          website: draft.website,
          address: draft.address,
          clientLogoText: draft.clientLogoText,
          clientSignatureText: draft.clientSignatureText,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Failed to update client");
      setEditingId(null);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
      await loadClients(page, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update client");
    } finally {
      setSavingId("");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Clients"
        description="Create, edit, and delete clients with full business profile details."
      />

      <Card className="mb-6 border-border/70 bg-card/90 shadow-[var(--shadow-premium)] backdrop-blur-[2px] transition-[box-shadow,border-color] duration-200 hover:border-primary/15 hover:shadow-[var(--shadow-premium-lg)]">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
                <UserPlus className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                  Create client
                </CardTitle>
                <CardDescription className="mt-1.5 max-w-xl text-[0.8125rem] leading-relaxed">
                  Add a new client record. Required fields are marked on the form.
                </CardDescription>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-muted/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border/60">
              New record
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={createClient} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Company</Label>
              <Input
                required
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Logo Upload</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await fileToText(file);
                  setForm((f) => ({ ...f, clientLogoText: text }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                {form.clientLogoText ? "Logo selected" : "No file chosen"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Signature Upload</Label>
              <Input
                type="file"
                accept="image/*"
                className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await fileToText(file);
                  setForm((f) => ({ ...f, clientSignatureText: text }));
                }}
              />
              <p className="text-xs text-muted-foreground">
                {form.clientSignatureText ? "Signature selected" : "No file chosen"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingId === "create"} className="min-w-[8.5rem]">
                {savingId === "create" ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90 shadow-[var(--shadow-premium)] backdrop-blur-[2px]">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 dark:bg-muted/50">
                <Users className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                  Client directory
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/20">
                    {total}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1 text-[0.8125rem]">
                  Search and open client profiles. Use horizontal scroll on smaller screens.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client name or email"
              className="h-10 flex-1 transition-[box-shadow] duration-200 sm:min-w-[240px]"
            />
            <Button
              variant="outline"
              className="h-10 shrink-0 gap-2 sm:w-auto"
              onClick={() => {
                setPage(1);
                loadClients(1, query);
              }}
            >
              <Search className="size-4 opacity-70" aria-hidden />
              Search
            </Button>
          </div>

          {error ? (
            <div
              className="rounded-2xl border border-destructive/35 bg-destructive/[0.06] p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/[0.1]"
              role="alert"
            >
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Name
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Client Company
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Email
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Phone
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Website
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Address
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Projects
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {items.map((client) => (
                      <tr
                        key={client._id}
                        className={cn(
                          "bg-card/40 transition-[background-color,box-shadow] duration-150",
                          "hover:bg-muted/35 dark:hover:bg-muted/20"
                        )}
                      >
                        <td className="px-4 py-3 align-middle font-medium text-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.name ?? client.name}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    name: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="line-clamp-2">{client.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-muted-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.company ?? client.company}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    company: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="line-clamp-2">{client.company || "—"}</span>
                          )}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 align-middle text-muted-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.email ?? client.email}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    email: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="line-clamp-2 break-all">{client.email || "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.phone ?? client.phone}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    phone: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            client.phone || "—"
                          )}
                        </td>
                        <td className="max-w-[160px] px-4 py-3 align-middle text-muted-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.website ?? client.website}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    website: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="line-clamp-2 break-all">{client.website || "—"}</span>
                          )}
                        </td>
                        <td className="max-w-[220px] px-4 py-3 align-middle text-muted-foreground">
                          {editingId === client._id ? (
                            <Input
                              value={drafts[client._id]?.address ?? client.address}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [client._id]: {
                                    ...(prev[client._id] ?? client),
                                    address: e.target.value,
                                  },
                                }))
                              }
                              className="h-9"
                            />
                          ) : (
                            <span className="line-clamp-2">{client.address || "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex min-w-[1.75rem] justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/15 transition-transform duration-150 hover:scale-105">
                            {client.projectsCount ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap gap-2">
                            {editingId === client._id ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => saveClient(client._id)}
                                  disabled={savingId === client._id}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button size="sm" variant="outline" asChild className="transition-[box-shadow,transform] duration-200 hover:border-primary/30 hover:bg-primary/5">
                                <Link href={`/admin/clients/${client._id}`}>View</Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/15">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              className="gap-1.5"
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                loadClients(next, query);
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <div className="flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
              {loading ? (
                <span className="inline-flex size-2 animate-pulse rounded-full bg-primary/60" aria-hidden />
              ) : null}
              <span className="tabular-nums font-medium">
                Page {page} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              className="gap-1.5"
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                loadClients(next, query);
              }}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
