import { NextResponse } from "next/server";
import { initializeSystem } from "@/lib/services/bootstrap/initialize-system.service";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const setupSecret = String(body.setupSecret ?? "");
  const adminName = String(body.adminName ?? "").trim();
  const adminEmail = String(body.adminEmail ?? "").trim().toLowerCase();
  const adminPassword = String(body.adminPassword ?? "");
  const createSampleData = Boolean(body.createSampleData);

  if (!setupSecret || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json(
      { message: "setupSecret, adminName, adminEmail and adminPassword are required" },
      { status: 400 }
    );
  }

  if (adminPassword.length < 8) {
    return NextResponse.json(
      { message: "Admin password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const result = await initializeSystem({
      setupSecret,
      adminName,
      adminEmail,
      adminPassword,
      createSampleData,
    });

    return NextResponse.json({
      message: "Initialization completed",
      dbName: result.dbName,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SETUP_SECRET_MISSING") {
      return NextResponse.json(
        { message: "SETUP_SECRET is not configured in environment" },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message === "SETUP_SECRET_INVALID") {
      return NextResponse.json({ message: "Invalid setup secret" }, { status: 403 });
    }
    return NextResponse.json({ message: "Initialization failed" }, { status: 500 });
  }
}
