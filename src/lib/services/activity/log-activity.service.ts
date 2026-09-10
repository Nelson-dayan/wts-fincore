import { ActivityLogModel } from "@/lib/db/models";
import { ActivityAction, ActivityMetadata } from "@/lib/types";

interface LogActivityInput {
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  message: string;
  projectId?: string;
  metadata?: ActivityMetadata;
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
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
    // Activity log should not block business actions.
  }
}

