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

  console.log("=== Checking current users in MongoDB ===");
  const users = await UserModel.find({}).select("+password");
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`- ${u.name} | ${u.email} | Role: ${u.role} | Active: ${u.isActive}`);
  }

  // Check companies
  const companies = await CompanyModel.find({});
  console.log(`Found ${companies.length} companies:`);
  for (const c of companies) {
    console.log(`- ${c.name} (${c.code || c._id})`);
  }

  const superAdminEmail = "admin@fincore.com";
  const superAdminPassword = "AdminPassword#2026!"; // Strong password meeting complexity requirements

  let target = await UserModel.findOne({ email: superAdminEmail }).select("+password");
  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  const memberships = companies.map((c) => ({
    companyId: c._id,
    role: "group_admin",
    permissions: ["*"],
    isDefault: c.isPrimary || false,
    joinedAt: new Date(),
    expiresAt: null,
  }));

  if (target) {
    console.log(`\nUpdating existing user ${superAdminEmail} to super_admin...`);
    target.role = "super_admin";
    target.password = hashedPassword;
    target.isActive = true;
    target.failedLoginAttempts = 0;
    target.lockoutUntil = null as any;
    if (companies.length > 0) {
      target.companyMemberships = memberships as any;
      target.defaultCompanyId = companies[0]._id as any;
    }
    await target.save();
    console.log(`✓ Successfully updated ${superAdminEmail} to super_admin!`);
  } else {
    console.log(`\nCreating new super_admin account for ${superAdminEmail}...`);
    target = await UserModel.create({
      name: "Super Administrator",
      email: superAdminEmail,
      password: hashedPassword,
      role: "super_admin",
      isActive: true,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      companyMemberships: memberships,
      defaultCompanyId: companies[0]?._id || null,
    });
    console.log(`✓ Successfully created super_admin account for ${superAdminEmail}!`);
  }

  console.log("\n==========================================");
  console.log("SUPER ADMIN CREDENTIALS CREATED / RESTORED:");
  console.log(`Email:    ${superAdminEmail}`);
  console.log(`Password: ${superAdminPassword}`);
  console.log(`Role:     super_admin`);
  console.log("==========================================");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to check/create super admin:", err);
  process.exit(1);
});
