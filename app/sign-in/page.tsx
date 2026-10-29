import { getSession } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import AuthForm from "@/components/auth-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await getSession();
  if (session?.user) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      <AuthForm mode="sign-in" />
    </main>
  );
}
