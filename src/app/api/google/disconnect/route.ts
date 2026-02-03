import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    await db.googleIntegration.delete({ where: { id: "default" } });
  } catch {
    // ignore if already disconnected
  }
  return NextResponse.json({ success: true });
}

