import { ActivityLogModel } from "@/lib/db/models";

interface LogActivityInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  projectId?: string;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await ActivityLogModel.create({
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      message: input.message,
      projectId: input.projectId,
    });
  } catch {
    // Activity log should not block business actions.
  }
}
