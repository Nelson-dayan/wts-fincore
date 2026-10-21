import path from "path";
import fs from "fs";
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

  console.log("=== ALL COMPANIES IN DATABASE ===");
  const companies = await CompanyModel.find({}).lean();
  for (const c of companies) {
    console.log(`ID: ${c._id.toString()} | Code: ${c.code} | Name: ${c.name} | isPrimary: ${c.isPrimary} | isActive: ${c.isActive}`);
  }

  console.log("\n=== ALL USERS IN DATABASE ===");
  const users = await UserModel.find({}).lean();
  for (const u of users) {
    console.log(`User: ${u.email} | Role: ${u.role} | Active: ${u.isActive} | DefaultCo: ${u.defaultCompanyId}`);
    const mems = (u.companyMemberships || []).map((m: any) => `${m.companyId} (${m.role})`).join(", ");
    console.log(`  Memberships (${(u.companyMemberships || []).length}): ${mems}`);
  }

  // Look specifically for 6a7af096bfb7b01601206f7e
  const targetCoId = "6a7af096bfb7b01601206f7e";
  console.log(`\n=== SEARCHING FOR COMPANY ${targetCoId} ===`);
  const foundCo = await CompanyModel.findById(targetCoId).lean();
  if (foundCo) {
    console.log("Found company:", foundCo.code, foundCo.name);
  } else {
    console.log("COMPANY NOT FOUND BY ID:", targetCoId);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
