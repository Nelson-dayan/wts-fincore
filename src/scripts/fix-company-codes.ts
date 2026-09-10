import fs from "fs";
import path from "path";

// Load .env file automatically
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        const val = vals.join("=").trim();
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch {
  // Ignore env read error
}

import { connectDB } from "../lib/db/connect";
import { CompanyModel } from "../lib/db/models";

async function fixCompanyCodes() {
  await connectDB();
  console.log("Connected to MongoDB.");

  const companies = await CompanyModel.find({});
  console.log("Current Companies in DB:");
  companies.forEach((c) => {
    console.log(`- ID: ${c._id}, Name: "${c.name}", Code: "${c.code}", Branding:`, c.branding);
  });

  // Update any company whose code is "HOLDING" or "HOLDI" to "HOLD"
  const updated = await CompanyModel.updateMany(
    { code: { $in: ["HOLDING", "HOLDI", "HOLDING_GROUP"] } },
    {
      $set: {
        code: "HOLD",
        "branding.quotationPrefix": "HOLD",
        "branding.invoicePrefix": "HOLD",
        "branding.poPrefix": "HOLD",
      },
    }
  );

  console.log(`✅ Updated ${updated.modifiedCount} company records.`);

  const afterCompanies = await CompanyModel.find({});
  console.log("Updated Companies in DB:");
  afterCompanies.forEach((c) => {
    console.log(`- ID: ${c._id}, Name: "${c.name}", Code: "${c.code}", Branding:`, c.branding);
  });

  process.exit(0);
}

fixCompanyCodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
