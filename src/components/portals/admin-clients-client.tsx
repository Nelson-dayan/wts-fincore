"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Loader2,
  Pencil,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { readFileAsPdfSafeDataUrl } from "@/lib/portals/read-file-as-pdf-safe-data-url";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function s(v: string | undefined | null): string {
  return v ?? "";
}

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

  function searchClients(override?: string) {
    const nextQuery = override !== undefined ? override : query;
    setPage(1);
    loadClients(1, nextQuery);
  }

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
  const end = Math.min(page * limit, total);
  const start = total === 0 ? 0 : (page - 1) * limit + 1;

  return (
    <div className="animate-fade-in">
      <DashboardPageHeader
        title="Clients"
        description="Keep every relationship in one place—profiles, contacts, and project counts ready for quotations and delivery."
      />

      <div className="space-y-8">
        <Card className="overflow-hidden border-border/80 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_56px_-24px_rgba(0,0,0,0.5)]">
          <div className="h-1 bg-linear-to-r from-primary/80 via-primary to-primary/40" />
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-5 dark:bg-muted/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                  <UserPlus className="size-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-[1.15rem] sm:text-xl">Add a client</CardTitle>
                  <CardDescription className="mt-1.5 max-w-xl">
                    Capture the basics now; open the profile anytime for documents, uploads, and history.
                  </CardDescription>
                </div>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                New record
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={createClient} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Upload client logo &amp; signature (optional)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Upload client logo</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="h-11 cursor-pointer border-border/80 bg-background/60 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/18"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await readFileAsPdfSafeDataUrl(file);
                        setForm((f) => ({ ...f, clientLogoText: text }));
                        e.target.value = "";
                      }}
                    />
                    {form.clientLogoText ? (
                      <div className="pt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                        <img
                          src={form.clientLogoText}
                          alt=""
                          className="h-10 max-w-40 rounded-md border border-border object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No image yet</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/90">Upload client signature</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="h-11 cursor-pointer border-border/80 bg-background/60 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/12 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/18"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const text = await readFileAsPdfSafeDataUrl(file);
                        setForm((f) => ({ ...f, clientSignatureText: text }));
                        e.target.value = "";
                      }}
                    />
                    {form.clientSignatureText ? (
                      <div className="pt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element -- data URL preview */}
                        <img
                          src={form.clientSignatureText}
                          alt=""
                          className="h-10 max-w-50 rounded-md border border-border object-contain object-left"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No image yet</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/90">Contact name</Label>
                <Input
                  required
                  autoComplete="name"
                  placeholder="Jordan Lee"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.name)}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/90">Company</Label>
                <Input
                  required
                  autoComplete="organization"
                  placeholder="Acme Industries"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.company)}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/90">Email</Label>
                <Input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="hello@company.com"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.email)}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/90">Phone</Label>
                <Input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 …"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.phone)}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground/90">
                  Website <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="url"
                  autoComplete="url"
                  placeholder="https://"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.website)}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-foreground/90">Address</Label>
                <Input
                  required
                  autoComplete="street-address"
                  placeholder="Street, city, region"
                  className="h-11 border-border/80 bg-background/60"
                  value={s(form.address)}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <Button
                  type="submit"
                  disabled={savingId === "create"}
                  size="lg"
                  className="h-11 rounded-xl font-semibold shadow-md shadow-primary/15"
                >
                  {savingId === "create" ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Creating…
                    </>
                  ) : (
                    "Create client"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-5 dark:bg-muted/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-foreground ring-1 ring-border/60 dark:bg-muted/40">
                  <Users className="size-5" aria-hidden />
                </span>
                <div>
                  <CardTitle className="text-[1.15rem] sm:text-xl">Directory</CardTitle>
                  <CardDescription className="mt-1.5 max-w-lg">
                    Search by name or email. Edit in place or open the full profile for deep work.
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                <Building2 className="size-3.5 opacity-70" aria-hidden />
                <span className="tabular-nums text-foreground">{total}</span>
                <span>clients</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={s(query)}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchClients(undefined)}
                  placeholder="Search by name or email…"
                  className="h-11 border-border/80 bg-background/80 pl-10 pr-4"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="h-11 shrink-0 rounded-xl px-5"
                  onClick={() => searchClients(undefined)}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-xl"
                  disabled={!query.trim()}
                  onClick={() => {
                    setQuery("");
                    searchClients("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error ? (
              <div className="m-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                {error}
              </div>
            ) : loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium">Loading clients…</p>
              </div>
            ) : !loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
                  <FolderKanban className="size-7" aria-hidden />
                </span>
                <p className="text-base font-semibold text-foreground">No clients found</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Try another search, or add your first client with the form above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-250 text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground dark:bg-muted/15">
                      <th className="px-5 py-3.5 pr-3">Client</th>
                      <th className="px-0 py-3.5 pr-3">Company</th>
                      <th className="px-0 py-3.5 pr-3">Email</th>
                      <th className="px-0 py-3.5 pr-3">Phone</th>
                      <th className="px-0 py-3.5 pr-3">Website</th>
                      <th className="px-0 py-3.5 pr-3">Address</th>
                      <th className="px-0 py-3.5 pr-3">Projects</th>
                      <th className="px-0 py-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map((client) => {
                      const isEditing = editingId === client._id;
                      const draft = drafts[client._id];
                      return (
                        <tr
                          key={client._id}
                          className={cn(
                            "bg-card transition-colors hover:bg-muted/35 dark:hover:bg-muted/20",
                            isEditing && "bg-primary/5 dark:bg-primary/10"
                          )}
                        >
                          <td className="px-5 py-3.5 pr-3">
                            <div className="flex items-center gap-3">
                              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary ring-1 ring-primary/15">
                                {initials(draft?.name ?? client.name)}
                              </span>
                              <div className="min-w-0">
                                {isEditing ? (
                                  <Input
                                    value={s(draft?.name ?? client.name)}
                                    onChange={(e) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [client._id]: { ...(prev[client._id] ?? client), name: e.target.value },
                                      }))
                                    }
                                    className="h-9 max-w-50 text-sm font-medium"
                                  />
                                ) : (
                                  <p className="truncate font-semibold text-foreground">{client.name}</p>
                                )}
                                <p className="truncate text-xs text-muted-foreground">
                                  …{client._id.slice(-8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-40 px-0 py-3.5 pr-3 text-muted-foreground">
                            {isEditing ? (
                              <Input
                                value={s(draft?.company ?? client.company)}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [client._id]: { ...(prev[client._id] ?? client), company: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            ) : (
                              <span className="line-clamp-2">{client.company || "—"}</span>
                            )}
                          </td>
                          <td className="max-w-50 px-0 py-3.5 pr-3 text-muted-foreground">
                            {isEditing ? (
                              <Input
                                type="email"
                                value={s(draft?.email ?? client.email)}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [client._id]: { ...(prev[client._id] ?? client), email: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            ) : (
                              <span className="line-clamp-2 break-all">{client.email || "—"}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-0 py-3.5 pr-3 tabular-nums text-muted-foreground">
                            {isEditing ? (
                              <Input
                                value={s(draft?.phone ?? client.phone)}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [client._id]: { ...(prev[client._id] ?? client), phone: e.target.value },
                                  }))
                                }
                                className="h-9 max-w-35 text-sm"
                              />
                            ) : (
                              client.phone || "—"
                            )}
                          </td>
                          <td className="max-w-40 px-0 py-3.5 pr-3 text-muted-foreground">
                            {isEditing ? (
                              <Input
                                value={s(draft?.website ?? client.website)}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [client._id]: { ...(prev[client._id] ?? client), website: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            ) : (
                              <span className="line-clamp-2 break-all">{client.website || "—"}</span>
                            )}
                          </td>
                          <td className="max-w-50 px-0 py-3.5 pr-3 text-muted-foreground">
                            {isEditing ? (
                              <Input
                                value={s(draft?.address ?? client.address)}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [client._id]: { ...(prev[client._id] ?? client), address: e.target.value },
                                  }))
                                }
                                className="h-9 text-sm"
                              />
                            ) : (
                              <span className="line-clamp-2">{client.address || "—"}</span>
                            )}
                          </td>
                          <td className="px-0 py-3.5 pr-3">
                            <span className="inline-flex min-w-8 justify-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                              {client.projectsCount ?? 0}
                            </span>
                          </td>
                          <td className="px-0 py-3.5 pr-5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-8 rounded-lg px-3"
                                    onClick={() => saveClient(client._id)}
                                    disabled={savingId === client._id}
                                  >
                                    {savingId === client._id ? (
                                      <>
                                        <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                                        Save
                                      </>
                                    ) : (
                                      "Save"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg px-2"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="size-4" aria-label="Cancel" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg px-2.5"
                                    onClick={() => {
                                      setEditingId(client._id);
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [client._id]: { ...client },
                                      }));
                                    }}
                                  >
                                    <Pencil className="size-3.5" aria-hidden />
                                    <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Edit</span>
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-8 rounded-lg px-2.5" asChild>
                                    <Link href={`/admin/clients/${client._id}`}>
                                      <ExternalLink className="size-3.5" aria-hidden />
                                      <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Profile</span>
                                    </Link>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {items.length > 0 ? (
              <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/5">
                <p className="text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {start}–{end}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg"
                    disabled={loading || page <= 1}
                    onClick={() => {
                      const next = Math.max(1, page - 1);
                      setPage(next);
                      loadClients(next, query);
                    }}
                  >
                    <ChevronLeft className="mr-1 size-4" aria-hidden />
                    Previous
                  </Button>
                  <span className="rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg"
                    disabled={loading || page >= totalPages}
                    onClick={() => {
                      const next = Math.min(totalPages, page + 1);
                      setPage(next);
                      loadClients(next, query);
                    }}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
