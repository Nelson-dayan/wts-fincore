"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Clients"
        description="Create, edit, and delete clients with full business profile details."
      />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Create Client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createClient} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Client Company</Label>
              <Input
                required
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Logo Upload</Label>
              <Input
                type="file"
                accept="image/*"
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
            <div className="space-y-1">
              <Label>Signature Upload</Label>
              <Input
                type="file"
                accept="image/*"
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
              <Button type="submit" disabled={savingId === "create"}>
                {savingId === "create" ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client List ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client name or email"
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                loadClients(1, query);
              }}
            >
              Search
            </Button>
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Client Company</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">Website</th>
                    <th className="py-2 pr-3">Address</th>
                    <th className="py-2 pr-3">Projects</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((client) => (
                      <tr key={client._id} className="border-t border-border/70">
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.name
                          )}
                        </td>
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.company || "-"
                          )}
                        </td>
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.email || "-"
                          )}
                        </td>
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.phone || "-"
                          )}
                        </td>
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.website || "-"
                          )}
                        </td>
                        <td className="py-2 pr-3">
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
                            />
                          ) : (
                            client.address || "-"
                          )}
                        </td>
                        <td className="py-2 pr-3">{client.projectsCount ?? 0}</td>
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
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
                              <>
                                <Link href={`/admin/clients/${client._id}`}>
                                  <Button size="sm" variant="outline">
                                    View
                                  </Button>
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                loadClients(next, query);
              }}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              variant="outline"
              disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
              onClick={() => {
                const next = Math.min(Math.ceil(total / limit), page + 1);
                setPage(next);
                loadClients(next, query);
              }}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
