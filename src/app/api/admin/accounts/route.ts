import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { connectDB } from "@/lib/db/connect";
import { AccountModel, CompanyModel } from "@/lib/db/models";
import { authErrorResponse } from "@/lib/api/route-auth";

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "employee"]);
    await connectDB();
    
    const items = await AccountModel.find({ isActive: true })
      .sort({ isPrimary: -1, name: 1 })
      .lean();
    
    // Convert Mongoose Decimal128 to numbers
    const sanitizedItems = JSON.parse(JSON.stringify(items), (key, value) => {
      if (value && typeof value === 'object' && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
      }
      return value;
    });

    return NextResponse.json({ items: sanitizedItems });
  } catch (error) {
    return authErrorResponse(error, "Failed to load accounts");
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["admin"]);
    await connectDB();
    const body = await req.json();
    
    // Ensure companyId
    if (!body.companyId) {
      const primary = await CompanyModel.findOne({ isPrimary: true }).select("_id").lean();
      if (primary) body.companyId = primary._id;
    }
    
    if (!body.companyId) {
      return NextResponse.json({ message: "companyId is required" }, { status: 400 });
    }

    body.createdBy = session.user.id;
    
    if (body.isPrimary) {
      await AccountModel.updateMany({ isPrimary: true }, { isPrimary: false });
    }
    
    const item = await AccountModel.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error, "Failed to create account");
  }
}
