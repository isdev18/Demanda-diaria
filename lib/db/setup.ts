import { pool } from "./index";

let setupPromise: Promise<void> | undefined;

export function ensureDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está configurada.");
  }
  setupPromise ??= setup();
  return setupPromise;
}

async function setup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7720241028)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY,
        "email" text NOT NULL UNIQUE,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "name" text,
        "image" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY,
        "expiresAt" timestamp NOT NULL,
        "token" text NOT NULL UNIQUE,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "ipAddress" text,
        "userAgent" text,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY,
        "accountId" text NOT NULL,
        "providerId" text NOT NULL,
        "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamp,
        "refreshTokenExpiresAt" timestamp,
        "scope" text,
        "password" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "user_profile" (
        "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
        "role" text NOT NULL DEFAULT 'employee',
        "employeeCode" text,
        "team" text,
        "unit" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT user_profile_role CHECK ("role" IN ('supervisor', 'employee'))
      );
      CREATE TABLE IF NOT EXISTS "employee" (
        "matricula" text PRIMARY KEY,
        "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "team" text NOT NULL,
        "shift" text NOT NULL,
        "specialties" text[] NOT NULL DEFAULT '{}',
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "activity" (
        "id" text PRIMARY KEY,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "why" text NOT NULL,
        "priority" text NOT NULL,
        "date" text NOT NULL,
        "time" text NOT NULL,
        "location" text NOT NULL,
        "equipment" text NOT NULL,
        "sector" text NOT NULL,
        "well" text NOT NULL,
        "employee" text NOT NULL REFERENCES "employee"("matricula"),
        "team" text NOT NULL,
        "shift" text NOT NULL,
        "status" text NOT NULL DEFAULT 'Pendente',
        "note" text NOT NULL DEFAULT '',
        "reason" text NOT NULL DEFAULT '',
        "attachments" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "completed_at" timestamp,
        "justification_at" timestamp
      );
      CREATE TABLE IF NOT EXISTS "activity_history" (
        "id" text PRIMARY KEY,
        "activity_id" text NOT NULL REFERENCES "activity"("id") ON DELETE CASCADE,
        "timestamp" timestamp NOT NULL DEFAULT now(),
        "user_name" text NOT NULL,
        "action" text NOT NULL,
        "from_status" text NOT NULL,
        "to_status" text NOT NULL,
        "reason" text NOT NULL DEFAULT '',
        "note" text NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS "app_settings" (
        "id" text PRIMARY KEY DEFAULT 'default',
        "organization" text NOT NULL,
        "supervisor_name" text NOT NULL,
        "supervisor_matricula" text NOT NULL,
        "teams" text[] NOT NULL DEFAULT '{}',
        "shifts" text[] NOT NULL DEFAULT '{}',
        "sectors" text[] NOT NULL DEFAULT '{}',
        "locations" text[] NOT NULL DEFAULT '{}',
        "equipment" text[] NOT NULL DEFAULT '{}',
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS "app_meta" (
        "key" text PRIMARY KEY,
        "value" text NOT NULL,
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS activity_employee_date_idx ON "activity" ("employee", "date");
      CREATE INDEX IF NOT EXISTS history_activity_idx ON "activity_history" ("activity_id", "timestamp" DESC);
    `);

    const resetDone = await client.query(
      `SELECT 1 FROM "app_meta" WHERE "key" = 'operational_reset_2026_10'`,
    );
    if (!resetDone.rowCount) {
      await client.query(`DELETE FROM "activity_history"`);
      await client.query(`DELETE FROM "activity"`);
      await client.query(
        `DELETE FROM "user" WHERE "id" IN (SELECT "userId" FROM "user_profile" WHERE "role" = 'employee')`,
      );
      await client.query(`DELETE FROM "employee"`);
      await client.query(
        `INSERT INTO "app_meta" ("key", "value") VALUES ('operational_reset_2026_10', 'completed')`,
      );
    }

    await client.query(
      `INSERT INTO "app_settings" (
        "id", "organization", "supervisor_name", "supervisor_matricula",
        "teams", "shifts", "sectors", "locations", "equipment"
      ) VALUES (
        'default', 'Minha unidade', '', '', ARRAY['Equipe geral'], ARRAY['Diurno'],
        ARRAY['Operação'], ARRAY['Unidade'], ARRAY['Geral']
      ) ON CONFLICT ("id") DO NOTHING`,
    );
    if (!resetDone.rowCount) {
      await client.query(
        `UPDATE "app_settings" SET
          "organization" = 'Minha unidade', "teams" = ARRAY['Equipe geral'],
          "shifts" = ARRAY['Diurno'], "sectors" = ARRAY['Operação'],
          "locations" = ARRAY['Unidade'], "equipment" = ARRAY['Geral'], "updated_at" = now()
         WHERE "id" = 'default'`,
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    setupPromise = undefined;
    throw error;
  } finally {
    client.release();
  }
}
