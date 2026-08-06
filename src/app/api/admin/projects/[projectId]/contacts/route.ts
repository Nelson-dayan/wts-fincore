import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorResponse } from "@/lib/api/route-auth";
import {
  getCandidateContactsForProject,
  getProjectContacts,
  removeContactFromProject,
  setContactRolesForProject,
} from "@/lib/services/business/project-contact.service";
import { ProjectContactRole } from "@/types/contact";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { projectId } = await params;

    const [assigned, candidates] = await Promise.all([
      getProjectContacts(projectId),
      getCandidateContactsForProject(projectId),
    ]);

    return NextResponse.json({ assigned, candidates });
  } catch (error) {
    return authErrorResponse(error, "Failed to load project contacts");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireRole(["admin", "employee"]);
    const { projectId } = await params;
    const body = await req.json();

    const contactId = String(body.contactId || "").trim();
    const roles: ProjectContactRole[] = Array.isArray(body.roles) ? body.roles : [];

    if (!contactId) {
      return NextResponse.json({ message: "Contact ID is required." }, { status: 400 });
    }

    const updatedGroup = await setContactRolesForProject({
      projectId,
      contactId,
      roles,
      createdBy: session.user.id,
    });

    if (!updatedGroup) {
      return NextResponse.json({ message: "Failed to update project contact roles" }, { status: 400 });
    }

    return NextResponse.json({ item: updatedGroup });
  } catch (error) {
    return authErrorResponse(error, "Failed to save project contact roles");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireRole(["admin", "employee"]);
    const { projectId } = await params;
    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ message: "contactId query parameter is required." }, { status: 400 });
    }

    const success = await removeContactFromProject(projectId, contactId);
    return NextResponse.json({ success });
  } catch (error) {
    return authErrorResponse(error, "Failed to remove contact from project");
  }
}
