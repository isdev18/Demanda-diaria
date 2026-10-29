import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { cleanText } from "@/lib/server-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matricula: string }> },
) {
  const context = await getAuthContext();
  if (context.role !== "supervisor") {
    return NextResponse.json({ error: "Somente a supervisão pode criar colaboradores." }, { status: 403 });
  }
  const { matricula: routeCode } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const matricula = cleanText(routeCode, 30).toLowerCase();
  const name = cleanText(body.name, 120);
  const password = String(body.password || "");
  const team = cleanText(body.team, 120);
  const shift = cleanText(body.shift, 120);
  const specialties = cleanList(body.specialties);
  if (!/^[a-z0-9._-]{2,30}$/.test(matricula) || name.length < 2 || password.length < 8) {
    return NextResponse.json(
      { error: "Informe matrícula, nome e senha com pelo menos 8 caracteres." },
      { status: 400 },
    );
  }
  if (!team || !shift || !specialties.length) {
    return NextResponse.json({ error: "Equipe, turno e especialidades são obrigatórios." }, { status: 400 });
  }
  const duplicate = await pool.query(`SELECT 1 FROM "employee" WHERE "matricula"=$1`, [matricula]);
  if (duplicate.rowCount) return NextResponse.json({ error: "Matrícula já cadastrada." }, { status: 409 });

  let userId = "";
  try {
    const created = await auth.api.signUpEmail({
      body: { email: `${matricula}@demanda.local`, password, name },
    });
    userId = created.user.id;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO "user_profile" ("userId","role","employeeCode","team") VALUES ($1,'employee',$2,$3)`,
        [userId, matricula, team],
      );
      await client.query(
        `INSERT INTO "employee" ("matricula","user_id","name","team","shift","specialties","active")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [matricula, userId, name, team, shift, specialties, body.active !== false],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return NextResponse.json({ matricula }, { status: 201 });
  } catch (error) {
    if (userId) await pool.query(`DELETE FROM "user" WHERE "id"=$1`, [userId]).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Não foi possível criar o acesso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ matricula: string }> },
) {
  const context = await getAuthContext();
  if (context.role !== "supervisor") {
    return NextResponse.json({ error: "Somente a supervisão pode editar colaboradores." }, { status: 403 });
  }
  const { matricula } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const specialties = cleanList(body.specialties);
  if (cleanText(body.name, 120).length < 2 || !specialties.length) {
    return NextResponse.json({ error: "Nome e especialidades são obrigatórios." }, { status: 400 });
  }
  const updated = await pool.query(
    `UPDATE "employee" SET "name"=$1,"team"=$2,"shift"=$3,"specialties"=$4,"active"=$5,"updated_at"=now()
     WHERE "matricula"=$6 RETURNING "user_id"`,
    [
      cleanText(body.name, 120), cleanText(body.team, 120), cleanText(body.shift, 120), specialties,
      body.active !== false, cleanText(matricula, 30).toLowerCase(),
    ],
  );
  if (!updated.rowCount) return NextResponse.json({ error: "Colaborador não encontrado." }, { status: 404 });
  await pool.query(`UPDATE "user" SET "name"=$1,"updatedAt"=now() WHERE "id"=$2`, [
    cleanText(body.name, 120), updated.rows[0].user_id,
  ]);
  await pool.query(`UPDATE "user_profile" SET "team"=$1,"updatedAt"=now() WHERE "userId"=$2`, [
    cleanText(body.team, 120), updated.rows[0].user_id,
  ]);
  return NextResponse.json({ ok: true });
}

function cleanList(value: unknown) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(list.map((item) => cleanText(item, 60)).filter(Boolean))].slice(0, 20);
}
