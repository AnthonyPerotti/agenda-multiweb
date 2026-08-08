import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

// POST /api/configuracoes/restaurar — restaurar banco de dados SQLite a partir de um arquivo .db enviado
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validar cabeçalho do arquivo SQLite ("SQLite format 3\0")
    const headerSqlite = buffer.subarray(0, 16).toString("utf-8");
    if (!headerSqlite.startsWith("SQLite format 3")) {
      return Response.json(
        { erro: "O arquivo enviado não é um banco de dados SQLite (.db) válido." },
        { status: 400 }
      );
    }

    const dataDir = path.join(process.cwd(), "prisma", "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "agenda.db");
    const backupPath = path.join(dataDir, `agenda-backup-pre-restore-${Date.now()}.db`);

    // Criar backup de segurança do banco atual antes de substituir
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
    }

    // Sobrescrever com o novo arquivo de banco
    fs.writeFileSync(dbPath, buffer);

    return Response.json({
      sucesso: true,
      mensagem: "Banco de dados restaurado com sucesso! Os dados foram atualizados.",
    });
  } catch (err) {
    console.error("[Restaurar Banco Erro]", err);
    return Response.json({ erro: "Erro ao restaurar o banco de dados" }, { status: 500 });
  }
}
