import { getSession, getUserRole } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import DemandaApp from "@/components/demanda-app";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const role = await getUserRole();

  return <DemandaApp role={role} userName={session.user.name} userEmail={session.user.email} />;
}
