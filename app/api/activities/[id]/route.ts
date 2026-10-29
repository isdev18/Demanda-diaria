import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { cleanText, validActivityBody } from "@/lib/server-data";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAuthContext();
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const current = await pool.query(`SELECT * FROM "activity" WHERE "id" = $1`, [id]);
  if (!current.rowCount) return NextResponse.json({ error: "Atividade não encontrada." }, { status: 404 });
  const old = current.rows[0];

  if (context.role === "employee") {
    if (old.employee !== context.employeeCode) {
      return NextResponse.json({ error: "Atividade de outro colaborador." }, { status: 403 });
    }
    const status = cleanText(body.status, 30);
    if (!["Pendente", "Em andamento", "Concluída", "Não realizada"].includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    await pool.query(
      `UPDATE "activity" SET "status"=$1, "note"=$2, "reason"=$3,
       "completed_at"=CASE WHEN $1='Concluída' THEN now() ELSE "completed_at" END,
       "justification_at"=CASE WHEN $1='Não realizada' THEN now() ELSE "justification_at" END
       WHERE "id"=$4`,
      [status, cleanText(body.note, 2000), cleanText(body.reason, 1000), id],
    );
    await addHistory(id, context.session.user.name || "Colaborador", old.status, status, body);
    return NextResponse.json({ ok: true });
  }

  if (!validActivityBody(body)) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }
  const employee = await pool.query(
    `SELECT "team", "shift" FROM "employee" WHERE "matricula"=$1 AND "active"=true`,
    [cleanText(body.employee, 30)],
  );
  if (!employee.rowCount) return NextResponse.json({ error: "Colaborador inválido ou inativo." }, { status: 400 });
  const status = cleanText(body.status, 30) || old.status;
  await pool.query(
    `UPDATE "activity" SET "title"=$1,"description"=$2,"why"=$3,"priority"=$4,"date"=$5,"time"=$6,
     "location"=$7,"equipment"=$8,"sector"=$9,"well"=$10,"employee"=$11,"team"=$12,"shift"=$13,
     "status"=$14,"note"=$15,"reason"=$16 WHERE "id"=$17`,
    [
      cleanText(body.title, 160), cleanText(body.description, 2000), cleanText(body.why, 1000),
      cleanText(body.priority, 20), cleanText(body.date, 10), cleanText(body.time, 5),
      cleanText(body.location, 120), cleanText(body.equipment, 120), cleanText(body.sector, 120),
      cleanText(body.well, 120), cleanText(body.employee, 30), employee.rows[0].team, employee.rows[0].shift,
      status, cleanText(body.note, 2000), cleanText(body.reason, 1000), id,
    ],
  );
  await addHistory(id, context.session.user.name || "Supervisão", old.status, status, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAuthContext();
  if (context.role !== "supervisor") {
    return NextResponse.json({ error: "Somente a supervisão pode excluir atividades." }, { status: 403 });
  }
  const { id } = await params;
  await pool.query(`DELETE FROM "activity" WHERE "id"=$1`, [id]);
  return new NextResponse(null, { status: 204 });
}

async function addHistory(
  activityId: string,
  userName: string,
  from: string,
  to: string,
  body: Record<string, unknown>,
) {
  await pool.query(
    `INSERT INTO "activity_history" ("id","activity_id","user_name","action","from_status","to_status","reason","note")
     VALUES ($1,$2,$3,'Atividade atualizada',$4,$5,$6,$7)`,
    [randomUUID(), activityId, userName, from, to, cleanText(body.reason, 1000), cleanText(body.note, 2000)],
  );
}
