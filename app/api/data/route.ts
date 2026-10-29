import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { ensureDatabase } from "@/lib/db/setup";
import { getSettings, mapActivity, mapEmployee, mapHistory } from "@/lib/server-data";

export async function GET() {
  try {
    await ensureDatabase();
    const context = await getAuthContext();
    const employeeOnly = context.role === "employee";
    if (employeeOnly && !context.employeeCode) {
      return NextResponse.json({ error: "Acesso sem colaborador vinculado." }, { status: 403 });
    }

    const [activities, employees, history, settings] = await Promise.all([
      pool.query(
        employeeOnly
          ? `SELECT * FROM "activity" WHERE "employee" = $1 ORDER BY "date" DESC, "time" DESC`
          : `SELECT * FROM "activity" ORDER BY "date" DESC, "time" DESC`,
        employeeOnly ? [context.employeeCode] : [],
      ),
      pool.query(
        employeeOnly
          ? `SELECT * FROM "employee" WHERE "matricula" = $1`
          : `SELECT * FROM "employee" ORDER BY "name"`,
        employeeOnly ? [context.employeeCode] : [],
      ),
      pool.query(
        employeeOnly
          ? `SELECT h.* FROM "activity_history" h JOIN "activity" a ON a."id" = h."activity_id" WHERE a."employee" = $1 ORDER BY h."timestamp" DESC`
          : `SELECT * FROM "activity_history" ORDER BY "timestamp" DESC`,
        employeeOnly ? [context.employeeCode] : [],
      ),
      getSettings(),
    ]);

    return NextResponse.json({
      activities: activities.rows.map(mapActivity),
      employees: employees.rows.map(mapEmployee),
      history: history.rows.map(mapHistory),
      settings,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    throw error;
  }
}
