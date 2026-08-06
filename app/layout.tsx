import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Agenda Multiweb – CTE/UFSM",
    template: "%s | Agenda Multiweb – CTE/UFSM",
  },
  description:
    "Sistema de agendamento de transmissões ao vivo e reservas do Mini Auditório da Coordenadoria de Tecnologia Educacional da UFSM.",
  keywords: ["UFSM", "CTE", "agendamento", "transmissão ao vivo", "mini auditório", "evento"],
  authors: [{ name: "CTE – UFSM" }],
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
