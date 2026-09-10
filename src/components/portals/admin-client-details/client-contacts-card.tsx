"use client";

import { useEffect, useState } from "react";
import { Plus, User, Mail, Phone, Briefcase, Building2, FileText, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/select";
import type { ContactData } from "@/types/contact";

export interface ClientContactsCardProps {
  clientId: string;
  clientName?: string;
}

export function ClientContactsCard({ clientId, clientName }: ClientContactsCardProps) {
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/clients/${clientId}/contacts`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchContacts();
    }
  }, [clientId]);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAlternatePhone("");
    setJobTitle("");
    setDepartment("");
    setNotes("");
    setStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: ContactData) => {
    setEditingContact(c);
    setFirstName(c.firstName);
    setLastName(c.lastName);
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setAlternatePhone(c.alternatePhone || "");
    setJobTitle(c.jobTitle || "");
    setDepartment(c.department || "");
    setNotes(c.notes || "");
    setStatus(c.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert("First name and last name are required.");
      return;
    }

    try {
      setSaving(true);
      if (editingContact?._id) {
        // PUT update
        const res = await fetch(`/api/admin/contacts/${editingContact._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone,
            alternatePhone,
            jobTitle,
            department,
            notes,
            status,
          }),
        });
        if (!res.ok) throw new Error("Failed to update contact");
      } else {
        // POST create
        const res = await fetch("/api/admin/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            firstName,
            lastName,
            email,
            phone,
            alternatePhone,
            jobTitle,
            department,
            notes,
            status,
          }),
        });
        if (!res.ok) throw new Error("Failed to create contact");
      }

      setIsModalOpen(false);
      fetchContacts();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/admin/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      fetchContacts();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="size-5 text-primary" />
            Client Contacts ({contacts.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key personnel and representatives for {clientName || "this client"}
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAddModal} className="gap-1.5">
          <Plus className="size-4" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="py-8 text-center border rounded-lg border-dashed bg-muted/20">
            <User className="size-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No contacts added yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Add technical, billing, or primary contacts for this client.
            </p>
            <Button size="sm" variant="outline" onClick={handleOpenAddModal}>
              <Plus className="size-3.5 mr-1" />
              Add First Contact
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contacts.map((c) => (
              <div
                key={c._id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {c.firstName} {c.lastName}
                        {c.status === "ACTIVE" ? (
                          <span className="inline-flex items-center text-[0.65rem] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="size-3 mr-0.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[0.65rem] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            <XCircle className="size-3 mr-0.5" /> Inactive
                          </span>
                        )}
                      </h4>
                      {c.jobTitle || c.department ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Briefcase className="size-3 shrink-0" />
                          {[c.jobTitle, c.department].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEditModal(c)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => c._id && handleDelete(c._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 text-xs text-muted-foreground">
                    {c.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <a href={`mailto:${c.email}`} className="hover:underline text-foreground/90">
                          {c.email}
                        </a>
                      </div>
                    ) : null}
                    {c.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{c.phone}</span>
                        {c.alternatePhone ? <span className="text-muted-foreground/60">(Alt: {c.alternatePhone})</span> : null}
                      </div>
                    ) : null}
                  </div>

                  {c.notes ? (
                    <p className="text-[0.75rem] text-muted-foreground/80 bg-muted/40 rounded p-1.5 mt-2 line-clamp-2">
                      <FileText className="size-3 inline mr-1" />
                      {c.notes}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-lg text-foreground">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  ✕
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-fn">First Name *</Label>
                    <Input id="c-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-ln">Last Name *</Label>
                    <Input id="c-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-email">Email</Label>
                    <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-job">Job Title</Label>
                    <Input id="c-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Lead Engineer" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-dept">Department</Label>
                    <Input id="c-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Technology" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-altphone">Alternate Phone</Label>
                    <Input id="c-altphone" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-status">Status</Label>
                    <Dropdown
                      id="c-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      options={[
                        { value: "ACTIVE", label: "Active" },
                        { value: "INACTIVE", label: "Inactive" },
                      ]}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="c-notes">Notes</Label>
                  <Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details or instructions" />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingContact ? "Update Contact" : "Add Contact"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
