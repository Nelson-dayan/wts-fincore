"use client";

import { Building2, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { readFileAsPdfSafeDataUrl } from "@/lib/portals/read-file-as-pdf-safe-data-url";
import type { ClientDetailsPayload, ClientProfileForm } from "./types";

function DetailTile({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-muted/20 p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/15 hover:shadow-sm dark:bg-muted/10",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-medium leading-snug text-foreground">{children}</div>
    </div>
  );
}

type ClientProfileCardProps = {
  data: ClientDetailsPayload;
  editing: boolean;
  saving: boolean;
  form: ClientProfileForm;
  onFormChange: (patch: Partial<ClientProfileForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
};

export function ClientProfileCard({
  data,
  editing,
  saving,
  form,
  onFormChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}: ClientProfileCardProps) {
  const clientName = data.client?.name;

  return (
    <Card className="mb-6 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px]">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/15">
              <Building2 className="size-6" strokeWidth={1.6} aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight sm:text-xl">Client profile</CardTitle>
              <CardDescription className="text-[0.8125rem] leading-relaxed">
                {clientName ? (
                  <>
                    <span className="font-medium text-foreground/90">{data.client?.company}</span>
                    {data.client?.createdAt ? (
                      <span className="mt-1 block text-muted-foreground">
                        Client since{" "}
                        <time dateTime={data.client.createdAt}>
                          {new Date(data.client.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Loading profile…"
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {editing ? (
              <>
                <Button size="sm" onClick={onSave} disabled={saving} className="min-w-18">
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onStartEdit}
                  className="transition-[box-shadow,border-color] duration-200 hover:border-primary/35 hover:bg-primary/5"
                >
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={onDelete} disabled={saving} className="gap-1.5">
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
        {editing ? (
          <>
            <div className="space-y-3 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brand (quotation PDF)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Upload client logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await readFileAsPdfSafeDataUrl(file);
                      onFormChange({ clientLogoText: text });
                      e.target.value = "";
                    }}
                  />
                  {form.clientLogoText ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL
                    <img
                      src={form.clientLogoText}
                      alt=""
                      className="mt-1 h-12 max-w-50 rounded-md border border-border object-contain"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Upload client signature</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/15"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await readFileAsPdfSafeDataUrl(file);
                      onFormChange({ clientSignatureText: text });
                      e.target.value = "";
                    }}
                  />
                  {form.clientSignatureText ? (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL
                    <img
                      src={form.clientSignatureText}
                      alt=""
                      className="mt-1 h-12 max-w-60 rounded-md border border-border object-contain object-left"
                    />
                  ) : null}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Client Company</Label>
              <Input value={form.company} onChange={(e) => onFormChange({ company: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => onFormChange({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => onFormChange({ website: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => onFormChange({ address: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client logo</p>
                {data.client?.clientLogoText || data.client?.clientLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URLs / legacy URLs
                  <img
                    src={data.client.clientLogoText || data.client.clientLogoUrl}
                    alt="Client logo"
                    className="h-24 max-w-55 rounded-lg border border-border/60 bg-background/80 object-contain shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No logo uploaded.</p>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client signature</p>
                {data.client?.clientSignatureText ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL
                  <img
                    src={data.client.clientSignatureText}
                    alt="Client signature"
                    className="h-24 max-w-65 rounded-lg border border-border/60 bg-background/80 object-contain object-left shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No signature uploaded.</p>
                )}
              </div>
            </div>
            <DetailTile label="Name">{data.client?.name ?? "—"}</DetailTile>
            <DetailTile label="Company">{data.client?.company ?? "—"}</DetailTile>
            <DetailTile label="Email">
              {data.client?.email ? (
                <span className="inline-flex items-center gap-2 break-all">
                  <Mail className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                  {data.client.email}
                </span>
              ) : (
                "—"
              )}
            </DetailTile>
            <DetailTile label="Phone">
              {data.client?.phone ? (
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Phone className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                  {data.client.phone}
                </span>
              ) : (
                "—"
              )}
            </DetailTile>
            <DetailTile label="Website" className="sm:col-span-2">
              {data.client?.website ? <span className="break-all">{data.client.website}</span> : "—"}
            </DetailTile>
            <DetailTile label="Address" className="sm:col-span-2">
              {data.client?.address ? (
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                  {data.client.address}
                </span>
              ) : (
                "—"
              )}
            </DetailTile>
          </>
        )}
      </CardContent>
    </Card>
  );
}
