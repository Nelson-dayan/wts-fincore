import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Load .env file automatically
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // Ignore env read error
}

import { connectDB } from "@/lib/db/connect";
import { UserModel, CompanyModel } from "@/lib/db/models";

async function main() {
  await connectDB();

  const companies = await CompanyModel.find({}).lean();
  console.log(`Found ${companies.length} companies.`);

  const memberships = companies.map((c) => ({
    companyId: c._id,
    role: "group_admin",
    permissions: ["*"],
    isDefault: c.isPrimary || false,
    joinedAt: new Date(),
    expiresAt: null,
  }));

  const primaryCompany = companies.find((c) => c.isPrimary) || companies[0];

  // 1. Update fincoresecseclance@fincore.com
  const user1 = await UserModel.findOne({ email: "fincoresecseclance@fincore.com" });
  if (user1) {
    user1.role = "super_admin";
    user1.isActive = true;
    user1.failedLoginAttempts = 0;
    user1.lockoutUntil = null as any;
    user1.companyMemberships = memberships as any;
    user1.defaultCompanyId = primaryCompany?._id as any;
    await user1.save();
    console.log("✓ fincoresecseclance@fincore.com promoted to super_admin with full company access");
  } else {
    console.log("User fincoresecseclance@fincore.com not found, creating...");
    const hashed = await bcrypt.hash("AdminPassword#2026!", 12);
    await UserModel.create({
      name: "Admin",
      email: "fincoresecseclance@fincore.com",
      password: hashed,
      role: "super_admin",
      isActive: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      companyMemberships: memberships,
      defaultCompanyId: primaryCompany?._id,
    });
    console.log("✓ Created fincoresecseclance@fincore.com as super_admin");
  }

  // 2. Ensure admin@fincore.com is also present as super_admin
  const user2 = await UserModel.findOne({ email: "admin@fincore.com" });
  if (user2) {
    user2.role = "super_admin";
    user2.isActive = true;
    user2.failedLoginAttempts = 0;
    user2.lockoutUntil = null as any;
    user2.companyMemberships = memberships as any;
    user2.defaultCompanyId = primaryCompany?._id as any;
    await user2.save();
    console.log("✓ admin@fincore.com confirmed as super_admin with full company access");
  }

  console.log("\nAll super admin accounts updated and synchronized!");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
