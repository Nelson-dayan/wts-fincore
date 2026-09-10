"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { initials, safeString } from "./helpers";
import type { ClientRow } from "./types";

type ClientsDirectoryRowProps = {
  client: ClientRow;
  draft?: Partial<ClientRow>;
  editingId: string | null;
  savingId: string;
  onStartEdit: (client: ClientRow) => void;
  onCancelEdit: () => void;
  onDraftChange: (clientId: string, patch: Partial<ClientRow>) => void;
  onSave: (clientId: string) => void;
};

export function ClientsDirectoryRow({
  client,
  draft,
  editingId,
  savingId,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
}: ClientsDirectoryRowProps) {
  const isEditing = editingId === client._id;
  const clientDetailsHref = `/admin/clients/${encodeURIComponent(String(client._id))}`;

  return (
    <tr
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
                value={safeString(draft?.name ?? client.name)}
                onChange={(e) => onDraftChange(client._id, { name: e.target.value })}
                className="h-9 max-w-50 text-sm font-medium"
              />
            ) : (
              <p className="truncate font-semibold text-foreground">{client.name}</p>
            )}
            <p className="truncate text-xs text-muted-foreground">…{client._id.slice(-8)}</p>
          </div>
        </div>
      </td>

      <td className="max-w-40 px-0 py-3.5 pr-3 text-muted-foreground">
        {isEditing ? (
          <Input
            value={safeString(draft?.company ?? client.company)}
            onChange={(e) => onDraftChange(client._id, { company: e.target.value })}
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
            value={safeString(draft?.email ?? client.email)}
            onChange={(e) => onDraftChange(client._id, { email: e.target.value })}
            className="h-9 text-sm"
          />
        ) : (
          <span className="line-clamp-2 break-all">{client.email || "—"}</span>
        )}
      </td>

      <td className="whitespace-nowrap px-0 py-3.5 pr-3 tabular-nums text-muted-foreground">
        {isEditing ? (
          <Input
            value={safeString(draft?.phone ?? client.phone)}
            onChange={(e) => onDraftChange(client._id, { phone: e.target.value })}
            className="h-9 max-w-35 text-sm"
          />
        ) : (
          client.phone || "—"
        )}
      </td>

      <td className="max-w-40 px-0 py-3.5 pr-3 text-muted-foreground">
        {isEditing ? (
          <Input
            value={safeString(draft?.website ?? client.website)}
            onChange={(e) => onDraftChange(client._id, { website: e.target.value })}
            className="h-9 text-sm"
          />
        ) : (
          <span className="line-clamp-2 break-all">{client.website || "—"}</span>
        )}
      </td>

      <td className="max-w-50 px-0 py-3.5 pr-3 text-muted-foreground">
        {isEditing ? (
          <Input
            value={safeString(draft?.address ?? client.address)}
            onChange={(e) => onDraftChange(client._id, { address: e.target.value })}
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
                className="rounded-lg px-3"
                onClick={() => onSave(client._id)}
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
              <Button size="sm" variant="outline" className="rounded-lg px-2.5" onClick={onCancelEdit}>
                <X className="size-4" aria-label="Cancel" />
              </Button>
            </>
          ) : (
            <>
              {/* <Button size="sm" variant="outline" className="h-8 rounded-lg px-2.5" onClick={() => onStartEdit(client)}>
                <Pencil className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-xs">Edit</span>
              </Button> */}
              <Button size="sm" variant="secondary" className="h-8 w-8 rounded-lg p-0" title="View client profile" aria-label="View client profile" asChild>
                <Link href={clientDetailsHref}>
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
