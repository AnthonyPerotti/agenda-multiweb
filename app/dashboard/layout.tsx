"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard/tickets", label: "Tickets", icone: "🎫" },
  { href: "/dashboard/agenda", label: "Agenda", icone: "📅" },
  { href: "/dashboard/configuracoes", label: "Configurações", icone: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData?.data;
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 30 }}
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarAberta ? "open" : ""}`}
        style={{ display: "flex", flexDirection: "column" }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #006633, #008040)",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>📅</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#f0f4ff" }}>Agenda Multiweb</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>CTE – UFSM</div>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`sidebar-item ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              <span>{item.icone}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Rodapé da sidebar */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <div style={{ padding: "8px 12px", marginBottom: 8, fontSize: 13 }}>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
              {session?.user?.name ?? "Equipe CTE"}
            </div>
            <div style={{ color: "#64748b", fontSize: 11 }}>{session?.user?.email}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: typeof window !== "undefined" ? `${window.location.origin}/` : "/" })}
            className="sidebar-item"
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "#f87171" }}
          >
            🚪 Sair
          </button>
          <a
            href="/"
            target="_blank"
            className="sidebar-item"
            style={{ display: "flex", fontSize: 12 }}
          >
            🌐 Ver site público
          </a>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="dashboard-layout" style={{ flex: 1 }}>
        {/* Topbar mobile */}
        <div style={{
          display: "none",
          padding: "0 16px",
          height: 56,
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }} id="mobile-topbar">
          <button
            onClick={() => setSidebarAberta(!sidebarAberta)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#f0f4ff", fontSize: 20 }}
          >
            ☰
          </button>
          <span style={{ fontWeight: 700, color: "#f0f4ff", fontSize: 14 }}>Agenda Multiweb</span>
          <div />
        </div>

        {children}
      </main>
    </div>
  );
}
