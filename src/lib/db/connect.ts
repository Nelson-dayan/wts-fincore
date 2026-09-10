import mongoose from "mongoose";

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = globalThis as typeof globalThis & { 
  __mongoose?: GlobalMongoose;
  __migrated?: boolean;
};

function getCache(): GlobalMongoose {
  if (!g.__mongoose) {
    g.__mongoose = { conn: null, promise: null };
  }
  return g.__mongoose;
}

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI or MONGO_URI must be set");
  const cache = getCache();
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: false, // Disabling autoIndex to avoid network latency of index checks on startup/compilation
    });
  }
  cache.conn = await cache.promise;
  // Run lazy background backfill for dual-status (non-blocking)
  runLazyBackfill().catch((err) => {
    console.error("Failed executing lazy backfill migration:", err);
  });
  return cache.conn;
}

async function runLazyBackfill() {
  if (g.__migrated) return;
  g.__migrated = true;
  try {
    const { InvoiceModel } = await import("@/lib/db/models/invoice.model");
    const unmigratedCount = await InvoiceModel.countDocuments({
      $or: [
        { lifecycleStatus: { $exists: false } },
        { paymentStatus: { $exists: false } },
        { lifecycleStatus: "DRAFT_HIDDEN", "extras._hiddenUntilSaved": false }
      ]
    });
    if (unmigratedCount > 0) {
      console.log(`[Migration] Found ${unmigratedCount} unmigrated invoices. Running backfill...`);
      const invoices = await InvoiceModel.find({
        $or: [
          { lifecycleStatus: { $exists: false } },
          { paymentStatus: { $exists: false } },
          { lifecycleStatus: "DRAFT_HIDDEN", "extras._hiddenUntilSaved": false }
        ]
      });
      for (const inv of invoices) {
        await inv.save();
      }
      console.log("[Migration] Dual-status backfill completed successfully.");
    }
  } catch (err) {
    console.error("Lazy dual-status backfill error:", err);
  }
}
