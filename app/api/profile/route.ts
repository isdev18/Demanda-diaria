import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { ensureDatabase } from "@/lib/db/setup";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
  await ensureDatabase();
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const matricula = String(body.matricula || "").trim();
  if (!/^[A-Za-z0-9._-]{2,30}$/.test(matricula)) {
    return NextResponse.json({ error: "Matrícula inválida" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7720241029)");
    const existing = await client.query(
      `SELECT 1 FROM "user_profile" WHERE "role" = 'supervisor' LIMIT 1`,
    );
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "O sistema já possui supervisão. Peça seu acesso à supervisora." },
        { status: 403 },
      );
    }
    await client.query(
      `INSERT INTO "user_profile" ("userId", "role", "employeeCode")
       VALUES ($1, 'supervisor', $2)
       ON CONFLICT ("userId") DO UPDATE SET "role" = 'supervisor', "employeeCode" = $2, "updatedAt" = now()`,
      [session.user.id, matricula],
    );
    await client.query(
      `UPDATE "app_settings" SET "supervisor_name" = $1, "supervisor_matricula" = $2, "updated_at" = now() WHERE "id" = 'default'`,
      [session.user.name || "Supervisão", matricula],
    );
    await client.query("COMMIT");
    return NextResponse.json({ role: "supervisor" });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await request.json();
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
  }
  await pool.query(
    `UPDATE "user" SET "name" = $1, "updatedAt" = now() WHERE "id" = $2`,
    [body.name.trim(), session.user.id],
  );
  await pool.query(
    `UPDATE "employee" SET "name" = $1, "updated_at" = now() WHERE "user_id" = $2`,
    [body.name.trim(), session.user.id],
  );
  return NextResponse.json({ name: body.name.trim() });
}
