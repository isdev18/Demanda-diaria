import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { cleanText, validActivityBody } from "@/lib/server-data";

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (context.role !== "supervisor") {
    return NextResponse.json({ error: "Somente a supervisão pode criar atividades." }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  if (!validActivityBody(body)) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  const employee = await pool.query(
    `SELECT "team", "shift" FROM "employee" WHERE "matricula" = $1 AND "active" = true`,
    [cleanText(body.employee, 30)],
  );
  if (!employee.rowCount) {
    return NextResponse.json({ error: "Colaborador inválido ou inativo." }, { status: 400 });
  }
  const id = `AT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO "activity" (
        "id", "title", "description", "why", "priority", "date", "time", "location",
        "equipment", "sector", "well", "employee", "team", "shift", "status", "note", "reason", "attachments"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Pendente',$15,'','[]'::jsonb)`,
      [
        id,
        cleanText(body.title, 160),
        cleanText(body.description, 2000),
        cleanText(body.why, 1000),
        cleanText(body.priority, 20),
        cleanText(body.date, 10),
        cleanText(body.time, 5),
        cleanText(body.location, 120),
        cleanText(body.equipment, 120),
        cleanText(body.sector, 120),
        cleanText(body.well, 120),
        cleanText(body.employee, 30),
        employee.rows[0].team,
        employee.rows[0].shift,
        cleanText(body.note, 2000),
      ],
    );
    await client.query(
      `INSERT INTO "activity_history" ("id", "activity_id", "user_name", "action", "from_status", "to_status", "note")
       VALUES ($1,$2,$3,'Atividade criada','—','Pendente',$4)`,
      [randomUUID(), id, context.session.user.name || "Supervisão", cleanText(body.note, 2000)],
    );
    await client.query("COMMIT");
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
