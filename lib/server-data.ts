import { pool } from "@/lib/db";
import type { Activity, Employee, History, Settings } from "@/lib/demanda";

export function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    why: String(row.why),
    priority: String(row.priority),
    date: String(row.date),
    time: String(row.time).slice(0, 5),
    location: String(row.location),
    equipment: String(row.equipment),
    sector: String(row.sector),
    well: String(row.well),
    employee: String(row.employee),
    team: String(row.team),
    shift: String(row.shift),
    status: row.status as Activity["status"],
    note: String(row.note || ""),
    reason: String(row.reason || ""),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    completedAt: row.completed_at
      ? new Date(row.completed_at as string | Date).toISOString()
      : "",
    justificationAt: row.justification_at
      ? new Date(row.justification_at as string | Date).toISOString()
      : "",
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    matricula: String(row.matricula),
    name: String(row.name),
    team: String(row.team),
    shift: String(row.shift),
    specialties: Array.isArray(row.specialties)
      ? row.specialties.map(String)
      : [],
    active: Boolean(row.active),
  };
}

export function mapHistory(row: Record<string, unknown>): History {
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    timestamp: new Date(row.timestamp as string | Date).toISOString(),
    user: String(row.user_name),
    action: String(row.action),
    from: String(row.from_status),
    to: String(row.to_status),
    reason: String(row.reason || ""),
    note: String(row.note || ""),
  };
}

export async function getSettings(): Promise<Settings> {
  const result = await pool.query(`SELECT * FROM "app_settings" WHERE "id" = 'default'`);
  const row = result.rows[0];
  return {
    organization: row.organization,
    supervisorName: row.supervisor_name,
    supervisorMatricula: row.supervisor_matricula,
    teams: row.teams,
    shifts: row.shifts,
    sectors: row.sectors,
    locations: row.locations,
    equipment: row.equipment,
  };
}

export function cleanText(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

export function validActivityBody(body: Record<string, unknown>) {
  const required = [
    "title",
    "description",
    "why",
    "priority",
    "date",
    "time",
    "location",
    "equipment",
    "sector",
    "well",
    "employee",
    "team",
    "shift",
  ];
  return required.every((key) => cleanText(body[key]).length > 0);
}
