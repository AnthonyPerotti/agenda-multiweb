"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard/tickets";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        senha,
        redirect: false,
      });

      console.log("[LOGIN CLIENT] Resultado do signIn:", res);

      if (res?.error) {
        setErro("E-mail ou senha incorretos. Verifique suas credenciais.");
        setCarregando(false);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error("[LOGIN CLIENT] Erro durante signIn:", err);
      setErro("Falha de autenticação. Tente novamente.");
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #001a0d 0%, #003333 40%, #003366 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, #006633, #008040)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(0,102,51,0.4)",
            }}
          >
            📅
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 4 }}>
            Agenda Multiweb
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>
            Acesso restrito à equipe CTE/UFSM
          </p>
        </div>

        {/* Formulário */}
        <div className="glass-card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="label">E-mail</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cte@ufsm.br"
                required
                autoComplete="username"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Senha</label>
              <input
                className="input"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {erro && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#f87171",
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                ⚠️ {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={carregando}
              style={{ width: "100%", padding: "13px", fontSize: 15, justifyContent: "center" }}
            >
              {carregando ? "⏳ Entrando..." : "Entrar no Sistema"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a
            href="/"
            style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}
            onMouseOver={(e) => ((e.target as HTMLAnchorElement).style.color = "#94a3b8")}
            onMouseOut={(e) => ((e.target as HTMLAnchorElement).style.color = "#64748b")}
          >
            ← Voltar para a página inicial
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
