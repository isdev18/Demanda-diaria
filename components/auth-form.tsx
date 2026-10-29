"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Badge, Lock, User, Loader2 } from "lucide-react";

export default function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const code = matricula.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,30}$/.test(code)) {
      setError("Informe uma matrícula válida.");
      return;
    }
    setLoading(true);

    try {
      const email = `${code}@demanda.local`;
      if (mode === "sign-up") {
        if (name.trim().length < 2) throw new Error("Informe o nome completo.");
        const result = await signUp.email({ email, password, name: name.trim() });
        if (result.error) {
          throw new Error(result.error.message || "Não foi possível criar a supervisão.");
        }
        const profileResult = await fetch("/api/profile", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matricula: code }),
        });
        if (!profileResult.ok) {
          const detail = await profileResult.json().catch(() => ({}));
          throw new Error(detail.error || "Não foi possível configurar a supervisão.");
        }
      } else {
        const result = await signIn.email({ email, password });
        if (result.error) throw new Error("Matrícula ou senha inválidas.");
      }
      router.push("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {mode === "sign-in" ? "Bem-vindo" : "Configurar supervisão"}
          </h1>
          <p className="text-slate-600">
            {mode === "sign-in"
              ? "Acesse a gestão de demanda diária"
              : "Crie a primeira conta supervisora do sistema"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "sign-up" && (
            <label className="block text-sm font-medium text-slate-700">
              Nome completo
              <span className="relative block mt-2">
                <User className="absolute left-3 top-2.5 text-slate-400 size-5" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={fieldClass}
                  autoComplete="name"
                  required
                  disabled={loading}
                />
              </span>
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Matrícula
            <span className="relative block mt-2">
              <Badge className="absolute left-3 top-2.5 text-slate-400 size-5" />
              <input
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder="Digite sua matrícula"
                className={fieldClass}
                autoComplete="username"
                required
                disabled={loading}
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Senha
            <span className="relative block mt-2">
              <Lock className="absolute left-3 top-2.5 text-slate-400 size-5" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className={fieldClass}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={8}
                disabled={loading}
              />
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3" role="alert">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Processando..." : mode === "sign-in" ? "Entrar" : "Criar supervisão"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-sm text-slate-600">
          {mode === "sign-in"
            ? "O acesso de colaboradores é criado pela supervisão."
            : "Depois desta configuração, somente a supervisão poderá criar acessos."}
        </div>
      </div>
    </div>
  );
}
