import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureDatabase } from "@/lib/db/setup";

export async function GET() {
  try {
    await ensureDatabase();
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
