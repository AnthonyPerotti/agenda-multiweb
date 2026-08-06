import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

// GET /api/configuracoes — ler configurações
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const configs = await prisma.configuracao.findMany({
    orderBy: { chave: "asc" },
  });

  // Mascarar senha SMTP na resposta
  const configsSeguras = configs.map((c) => ({
    ...c,
    valor: c.chave === "smtp_pass" && c.valor ? "••••••••" : c.valor,
  }));

  return Response.json({ configuracoes: configsSeguras });
}

// POST /api/configuracoes — salvar configurações
const schemaConfig = z.object({
  configuracoes: z.record(z.string(), z.string()),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const sessaoUsuario = session.user as { perfil?: string };
  if (sessaoUsuario.perfil !== "ADMIN") {
    return Response.json({ erro: "Apenas administradores podem alterar configurações" }, { status: 403 });
  }

  const body = await request.json();
  const dados = schemaConfig.parse(body);

  // Salvar cada configuração (upsert)
  await Promise.all(
    Object.entries(dados.configuracoes).map(([chave, valor]) => {
      // Não sobrescrever smtp_pass com a máscara
      if (chave === "smtp_pass" && valor === "••••••••") return Promise.resolve();
      
      const val = String(valor);
      return prisma.configuracao.upsert({
        where: { chave },
        update: { valor: val },
        create: { chave, valor: val },
      });
    })
  );

  return Response.json({ sucesso: true });
}
