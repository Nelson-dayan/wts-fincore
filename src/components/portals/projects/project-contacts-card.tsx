"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserCheck, Plus, Pencil, Trash2, Mail, Phone, ShieldCheck, Check, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProjectContactRole,
  PROJECT_CONTACT_ROLE_LABELS,
  type ProjectContactGrouped,
  type ContactData,
} from "@/types/contact";

export interface ProjectContactsCardProps {
  projectId: string;
  projectName?: string;
  clientId?: string;
}

const ROLE_OPTIONS = Object.values(ProjectContactRole);

export function ProjectContactsCard({ projectId, projectName, clientId }: ProjectContactsCardProps) {
  const [assigned, setAssigned] = useState<ProjectContactGrouped[]>([]);
  const [candidates, setCandidates] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

  // Assignment Modal state
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<ProjectContactRole[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAssignModalOpen && !isNewContactModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        setIsAssignModalOpen(false);
        setIsNewContactModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isAssignModalOpen, isNewContactModalOpen, saving]);

  // Create New Contact Modal state
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const fetchProjectContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/projects/${projectId}/contacts`);
      if (!res.ok) throw new Error("Failed to load project contacts");
      const data = await res.json();
      setAssigned(data.assigned || []);
      setCandidates(data.candidates || []);
    } catch (err: any) {
      console.error("Error loading project contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectContacts();
    }
  }, [projectId]);

  const handleOpenAssignModal = (group?: ProjectContactGrouped) => {
    if (group) {
      setSelectedContactId(group.contact._id || "");
      setSelectedRoles(group.roles || []);
    } else {
      setSelectedContactId(candidates.length > 0 ? candidates[0]._id || "" : "");
      setSelectedRoles([ProjectContactRole.PRIMARY]);
    }
    setIsAssignModalOpen(true);
  };

  const toggleRole = (role: ProjectContactRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactId) {
      alert("Please select a contact.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/projects/${projectId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          roles: selectedRoles,
        }),
      });
      if (!res.ok) throw new Error("Failed to save project contact roles");

      setIsAssignModalOpen(false);
      fetchProjectContacts();
    } catch (err: any) {
      alert(err.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromProject = async (contactId: string) => {
    if (!confirm("Are you sure you want to remove this contact from the project?")) return;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/contacts?contactId=${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove contact");
      fetchProjectContacts();
    } catch (err: any) {
      alert(err.message || "Failed to remove contact");
    }
  };

  const handleCreateNewContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim()) {
      alert("First name and last name are required.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          firstName: newFirstName,
          lastName: newLastName,
          email: newEmail,
          phone: newPhone,
          jobTitle: newJobTitle,
          department: newDepartment,
        }),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      const data = await res.json();
      const createdContact: ContactData = data.item;

      setIsNewContactModalOpen(false);
      // Automatically preselect created contact in assign modal
      setSelectedContactId(createdContact._id || "");
      setSelectedRoles([ProjectContactRole.PRIMARY]);
      setIsAssignModalOpen(true);
      fetchProjectContacts();
    } catch (err: any) {
      alert(err.message || "Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="size-5 text-primary" />
            Project Contacts & Roles ({assigned.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign contacts to specific operational roles for {projectName || "this project"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsNewContactModalOpen(true)} className="gap-1.5">
            <PlusCircle className="size-3.5" />
            New Contact
          </Button>
          <Button size="sm" onClick={() => handleOpenAssignModal()} className="gap-1.5">
            <Plus className="size-4" />
            Assign Contact
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading project contacts...</div>
        ) : assigned.length === 0 ? (
          <div className="py-8 text-center border rounded-lg border-dashed bg-muted/20">
            <UserCheck className="size-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No contacts assigned to this project yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Assign technical leads, billing contacts, or sign-off approvers.
            </p>
            <Button size="sm" onClick={() => handleOpenAssignModal()}>
              <Plus className="size-3.5 mr-1" />
              Assign Contact to Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assigned.map((g) => (
              <div
                key={g.contact._id}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {g.contact.firstName} {g.contact.lastName}
                        {g.contact.clientId ? (
                          <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                            Client Contact
                          </span>
                        ) : (
                          <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                            Independent
                          </span>
                        )}
                      </h4>
                      {g.contact.jobTitle || g.contact.department ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[g.contact.jobTitle, g.contact.department].filter(Boolean).join(" • ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenAssignModal(g)}
                        title="Edit Assigned Roles"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => g.contact._id && handleRemoveFromProject(g.contact._id)}
                        title="Unassign from Project"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {g.contact.email ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate">{g.contact.email}</span>
                      </div>
                    ) : null}
                    {g.contact.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 shrink-0" />
                        <span>{g.contact.phone}</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Assigned Role Badges */}
                  <div className="pt-2 border-t mt-2">
                    <p className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="size-3 text-primary" /> Assigned Roles:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.roles.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[0.7rem] font-medium text-primary"
                        >
                          <Check className="size-3" />
                          {PROJECT_CONTACT_ROLE_LABELS[r] || r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Assign / Edit Roles */}
        {mounted && isAssignModalOpen ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => !saving && setIsAssignModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-[96vw] sm:max-w-lg rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-lg text-foreground">
                  Assign Roles to Project Contact
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setIsAssignModalOpen(false)}>
                  ✕
                </Button>
              </div>

              <form onSubmit={handleSaveRoles} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pc-select">Select Contact</Label>
                  <Dropdown
                    id="pc-select"
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    options={candidates.map((c) => ({
                      value: c._id || "",
                      label: `${c.firstName} ${c.lastName}${c.jobTitle ? ` (${c.jobTitle})` : ""}${c.clientId ? " [Client]" : " [Independent]"}`,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Assign Roles (One contact can have multiple roles):
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border rounded-md">
                    {ROLE_OPTIONS.map((role) => {
                      const isSelected = selectedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/70 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <div
                            className={`size-4 rounded flex items-center justify-center border ${
                              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                            }`}
                          >
                            {isSelected ? <Check className="size-3" /> : null}
                          </div>
                          <span className="truncate">{PROJECT_CONTACT_ROLE_LABELS[role]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !selectedContactId}>
                    {saving ? "Saving..." : "Save Project Roles"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        ) : null}

        {/* Modal: Create New Contact */}
        {mounted && isNewContactModalOpen ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
              onClick={() => !saving && setIsNewContactModalOpen(false)}
            />
            <div className="relative z-10 w-full max-w-[96vw] sm:max-w-lg rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto my-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-semibold text-lg text-foreground">Create Contact & Assign to Project</h3>
                <Button size="sm" variant="ghost" onClick={() => setIsNewContactModalOpen(false)}>
                  ✕
                </Button>
              </div>

              <form onSubmit={handleCreateNewContact} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-fn">First Name *</Label>
                    <Input id="nc-fn" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-ln">Last Name *</Label>
                    <Input id="nc-ln" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-email">Email</Label>
                    <Input id="nc-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-phone">Phone</Label>
                    <Input id="nc-phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-job">Job Title</Label>
                    <Input id="nc-job" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} placeholder="e.g. Technical Director" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nc-dept">Department</Label>
                    <Input id="nc-dept" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g. Engineering" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsNewContactModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create & Next"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        ) : null}
      </CardContent>
    </Card>
  );
}
