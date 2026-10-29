import { auth } from "./auth";
import { db } from "./db";
import { employee, userProfile } from "./db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { ensureDatabase } from "./db/setup";

export async function getSession() {
  await ensureDatabase();
  const headersList = await headers();
  return auth.api.getSession({ headers: headersList });
}

export async function getAuthContext() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const profile = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, session.user.id),
  });
  if (profile?.role !== "supervisor") {
    const employeeRecord = profile?.employeeCode
      ? await db.query.employee.findFirst({
          where: eq(employee.matricula, profile.employeeCode),
        })
      : undefined;
    if (!employeeRecord?.active) throw new Error("Unauthorized");
  }
  return {
    session,
    role: (profile?.role === "supervisor" ? "supervisor" : "employee") as
      | "supervisor"
      | "employee",
    employeeCode: profile?.employeeCode || "",
  };
}

export async function getUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getUserRole(): Promise<"supervisor" | "employee"> {
  return (await getAuthContext()).role;
}

export async function requireRole(role: "supervisor" | "employee") {
  const userRole = await getUserRole();
  if (userRole !== role) {
    throw new Error(`Unauthorized: required role ${role}`);
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
