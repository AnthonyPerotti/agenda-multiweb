import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

// GET /api/configuracoes/backup — baixar cópia do banco de dados SQLite
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const dbPath = path.join(process.cwd(), "prisma", "data", "agenda.db");
    if (!fs.existsSync(dbPath)) {
      return Response.json({ erro: "Arquivo do banco de dados não encontrado." }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const dateStr = new Date().toISOString().substring(0, 10);

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="backup-agenda-multiweb-${dateStr}.db"`,
      },
    });
  } catch (err) {
    console.error("[Backup Download Erro]", err);
    return Response.json({ erro: "Erro ao gerar backup do banco de dados" }, { status: 500 });
  }
}
