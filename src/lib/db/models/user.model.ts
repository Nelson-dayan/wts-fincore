import { model, models } from "mongoose";
import { userSchema } from "@/lib/db/schemas/user.schema";

export const UserModel = models.User ?? model("User", userSchema);
