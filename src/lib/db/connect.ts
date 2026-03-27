import mongoose from "mongoose";

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = globalThis as typeof globalThis & { __mongoose?: GlobalMongoose };

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
      autoIndex: process.env.NODE_ENV !== "production",
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
