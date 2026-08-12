import { Building2, Mail, MapPin, Phone, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/constants/finance";
import { cn } from "@/lib/utils/cn";
import { UploadCard } from "@/components/ui/upload-card";
import { isImageSrc } from "@/lib/utils/is-image-src";
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
  onOpenStatement?: () => void;
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
  onOpenStatement,
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
                  onClick={onOpenStatement}
                  className="transition-[box-shadow,border-color] duration-200 hover:border-primary/35 hover:bg-primary/5 flex items-center gap-1.5"
                >
                  <Receipt className="size-3.5" aria-hidden />
                  Statement
                </Button>
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
            {/* Top Logo Section */}
            <div className="space-y-3 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Brand (quotation PDF)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <UploadCard
                  label="Upload client logo"
                  value={form.clientLogoText}
                  onChange={(val) => onFormChange({ clientLogoText: val })}
                />
                <UploadCard
                  label="Upload client signature"
                  value={form.clientSignatureText}
                  onChange={(val) => onFormChange({ clientSignatureText: val })}
                />
              </div>
            </div>

            <div className="sm:col-span-2 mt-4 pt-4 border-t space-y-4">
              <h4 className="font-semibold text-primary">Basic Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => onFormChange({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
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
              </div>
            </div>

            <div className="sm:col-span-2 mt-4 pt-4 border-t space-y-4">
              <h4 className="font-semibold text-primary">Billing & Accounting</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Tax ID / GST No</Label>
                  <Input value={form.taxId} onChange={(e) => onFormChange({ taxId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Currency</Label>
                  <Select 
                    value={form.currency} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onFormChange({ currency: e.target.value })}
                    options={[...SUPPORTED_CURRENCIES]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={form.paymentTerms} onChange={(e) => onFormChange({ paymentTerms: e.target.value })} placeholder="Net 30" />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 mt-4 pt-4 border-t space-y-4">
              <h4 className="font-semibold text-primary">Location</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Billing Address</Label>
                  <Input value={form.billingAddress} onChange={(e) => onFormChange({ billingAddress: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <Input value={form.shippingAddress} onChange={(e) => onFormChange({ shippingAddress: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => onFormChange({ city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>State / Province</Label>
                  <Input value={form.state} onChange={(e) => onFormChange({ state: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Zip / Postal Code</Label>
                  <Input value={form.zipCode} onChange={(e) => onFormChange({ zipCode: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => onFormChange({ country: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 mt-4 pt-4 border-t space-y-4">
              <h4 className="font-semibold text-primary">Additional Information</h4>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => onFormChange({ website: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Input value={form.notes} onChange={(e) => onFormChange({ notes: e.target.value })} placeholder="Private notes about this client..." />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client logo</p>
                {isImageSrc(data.client?.clientLogoText) || isImageSrc(data.client?.clientLogoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URLs / legacy URLs
                  <img
                    src={(isImageSrc(data.client?.clientLogoText) ? data.client?.clientLogoText : data.client?.clientLogoUrl) || ""}
                    alt="Client logo"
                    className="h-24 max-w-55 rounded-lg border border-border/60 bg-background/80 object-contain shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No logo uploaded.</p>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/15 p-4 dark:bg-muted/10">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client signature</p>
                {isImageSrc(data.client?.clientSignatureText) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL
                  <img
                    src={data.client?.clientSignatureText || ""}
                    alt="Client signature"
                    className="h-24 max-w-65 rounded-lg border border-border/60 bg-background/80 object-contain object-left shadow-sm transition-transform duration-200 hover:scale-[1.02]"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No signature uploaded.</p>
                )}
              </div>
            </div>
            
            <div className="sm:col-span-2 mt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Billing & Accounting</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DetailTile label="Tax ID / GST No">{data.client?.taxId || "—"}</DetailTile>
                <DetailTile label="Currency">{data.client?.currency || "AED"}</DetailTile>
                <DetailTile label="Payment Terms">{data.client?.paymentTerms || "—"}</DetailTile>
              </div>
            </div>

            <div className="sm:col-span-2 mt-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Location</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailTile label="Billing Address">
                  {data.client?.billingAddress || data.client?.address ? (
                    <span className="inline-flex items-start gap-2">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                      {data.client.billingAddress || data.client.address}
                    </span>
                  ) : "—"}
                </DetailTile>
                <DetailTile label="Shipping Address">
                  {data.client?.shippingAddress ? (
                    <span className="inline-flex items-start gap-2">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                      {data.client.shippingAddress}
                    </span>
                  ) : "—"}
                </DetailTile>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <DetailTile label="City">{data.client?.city || "—"}</DetailTile>
                <DetailTile label="State / Province">{data.client?.state || "—"}</DetailTile>
                <DetailTile label="Zip / Postal">{data.client?.zipCode || "—"}</DetailTile>
                <DetailTile label="Country">{data.client?.country || "—"}</DetailTile>
              </div>
            </div>

            <div className="sm:col-span-2 mt-2 mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailTile label="Website">
                  {data.client?.website ? <span className="break-all">{data.client.website}</span> : "—"}
                </DetailTile>
                <DetailTile label="Notes">
                  {data.client?.notes || "—"}
                </DetailTile>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
