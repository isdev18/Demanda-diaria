import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { cleanText } from "@/lib/server-data";

export async function PUT(request: Request) {
  const context = await getAuthContext();
  if (context.role !== "supervisor") {
    return NextResponse.json({ error: "Somente a supervisão pode alterar configurações." }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const arrays = ["teams", "shifts", "sectors", "locations", "equipment"] as const;
  const values = arrays.map((key) => cleanList(body[key]));
  if (!cleanText(body.organization, 160) || values.some((value) => !value.length)) {
    return NextResponse.json({ error: "Preencha todos os grupos de configuração." }, { status: 400 });
  }
  await pool.query(
    `UPDATE "app_settings" SET "organization"=$1,"supervisor_name"=$2,"supervisor_matricula"=$3,
     "teams"=$4,"shifts"=$5,"sectors"=$6,"locations"=$7,"equipment"=$8,"updated_at"=now() WHERE "id"='default'`,
    [
      cleanText(body.organization, 160), cleanText(body.supervisorName, 120), cleanText(body.supervisorMatricula, 30),
      ...values,
    ],
  );
  return NextResponse.json({ ok: true });
}

function cleanList(value: unknown) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(list.map((item) => cleanText(item, 100)).filter(Boolean))];
}
