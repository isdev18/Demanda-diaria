import { auth } from "@/lib/auth";
import { ensureDatabase } from "@/lib/db/setup";
import { pool } from "@/lib/db";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  await ensureDatabase();
  return handler.GET(request);
}

export async function POST(request: Request) {
  await ensureDatabase();
  if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
    const initialized = await pool.query(
      `SELECT 1 FROM "user_profile" WHERE "role" = 'supervisor' LIMIT 1`,
    );
    if (initialized.rowCount) {
      return Response.json(
        { message: "Novos acessos são criados pela supervisão." },
        { status: 403 },
      );
    }
  }
  return handler.POST(request);
}
