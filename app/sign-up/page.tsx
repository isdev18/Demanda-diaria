import { getSession } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";
import { ensureDatabase } from "@/lib/db/setup";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  await ensureDatabase();
  const session = await getSession();
  if (session?.user) redirect("/");
  const initialized = await pool.query(
    `SELECT 1 FROM "user_profile" WHERE "role" = 'supervisor' LIMIT 1`,
  );
  if (initialized.rowCount) redirect("/sign-in");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      <AuthForm mode="sign-up" />
    </main>
  );
}
