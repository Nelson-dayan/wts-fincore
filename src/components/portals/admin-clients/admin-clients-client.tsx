"use client";

import { useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { CreateClientCard } from "@/components/portals/admin-clients/create-client-card";
import { ClientsDirectoryCard } from "@/components/portals/admin-clients/clients-directory-card";
import { EMPTY_CLIENT_FORM } from "@/components/portals/admin-clients/helpers";
import type { ClientForm, ClientRow } from "@/components/portals/admin-clients/types";
import { readResponseJson } from "@/lib/http/read-response-json";

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

  const [form, setForm] = useState<ClientForm>(EMPTY_CLIENT_FORM);
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
      const payload = await readResponseJson<{
        items?: ClientRow[];
        total?: number;
        message?: string;
      }>(response);
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
      const payload = await readResponseJson<{ message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Failed to create client");
      setForm(EMPTY_CLIENT_FORM);
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
      const payload = await readResponseJson<{ message?: string }>(response);
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

  function startEdit(client: ClientRow) {
    setEditingId(client._id);
    setDrafts((prev) => ({
      ...prev,
      [client._id]: { ...client },
    }));
  }

  function updateDraft(clientId: string, patch: Partial<ClientRow>) {
    setDrafts((prev) => ({
      ...prev,
      [clientId]: { ...(prev[clientId] ?? {}), ...patch },
    }));
  }

  function prevPage() {
    const next = Math.max(1, page - 1);
    setPage(next);
    loadClients(next, query);
  }

  function nextPage() {
    const next = Math.min(totalPages, page + 1);
    setPage(next);
    loadClients(next, query);
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
        <CreateClientCard
          form={form}
          saving={savingId === "create"}
          onFormChange={setForm}
          onSubmit={createClient}
        />
        <ClientsDirectoryCard
          items={items}
          query={query}
          total={total}
          page={page}
          totalPages={totalPages}
          start={start}
          end={end}
          loading={loading}
          error={error}
          editingId={editingId}
          savingId={savingId}
          drafts={drafts}
          onQueryChange={setQuery}
          onSearch={searchClients}
          onPrev={prevPage}
          onNext={nextPage}
          onStartEdit={startEdit}
          onCancelEdit={() => setEditingId(null)}
          onDraftChange={updateDraft}
          onSave={saveClient}
        />
      </div>
    </div>
  );
}
