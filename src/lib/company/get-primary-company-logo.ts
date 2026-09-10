import { connection } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { CompanyModel } from "@/lib/db/models";

/** Primary company logo from Admin → Company (same field as PDF branding). */
export async function getPrimaryCompanyLogoForPortal(): Promise<string | null> {
  try {
    await connection();
    await connectDB();
    const item = await CompanyModel.findOne({ isPrimary: true })
      .sort({ updatedAt: -1 })
      .select("logoText")
      .lean();
    const raw = item?.logoText;
    if (typeof raw !== "string") return null;
    const logo = raw.trim();
    if (!logo) return null;
    if (
      logo.startsWith("data:") ||
      logo.startsWith("https://") ||
      logo.startsWith("http://")
    ) {
      return logo;
    }
    return null;
  } catch {
    return null;
  }
}
