import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api/route-auth";
import { connectDB } from "@/lib/db/connect";
import { ProjectModel } from "@/lib/db/models";
import { authorizeResource } from "@/lib/auth/authorization";
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
    await connectDB();
    const { projectId } = await params;

    const project = await ProjectModel.findById(projectId).select("companyId").lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.view",
      companyId: project.companyId ? String(project.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

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
    await connectDB();
    const { projectId } = await params;

    const project = await ProjectModel.findById(projectId).select("companyId").lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.edit",
      companyId: project.companyId ? String(project.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }
    const session = auth.context;

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
      createdBy: session.userId,
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
    await connectDB();
    const { projectId } = await params;

    const project = await ProjectModel.findById(projectId).select("companyId").lean();
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    const auth = await authorizeResource({
      permission: "projects.edit",
      companyId: project.companyId ? String(project.companyId) : undefined,
      projectId,
    });
    if (!auth.authorized) {
      return authErrorResponse({ message: auth.reason, code: auth.code }, "Access denied");
    }

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
