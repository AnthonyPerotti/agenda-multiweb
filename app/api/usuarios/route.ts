import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// GET /api/usuarios — listar usuários
export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });

  return Response.json({ usuarios });
}

// POST /api/usuarios — criar usuário
const schemaCriar = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  perfil: z.enum(["ADMIN", "MEMBRO"]).default("MEMBRO"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  
  // Apenas admins podem criar usuários
  const sessaoUsuario = session.user as { perfil?: string };
  if (sessaoUsuario.perfil !== "ADMIN") {
    return Response.json({ erro: "Apenas administradores podem criar usuários" }, { status: 403 });
  }

  const body = await request.json();
  const dados = schemaCriar.parse(body);

  const jaExiste = await prisma.usuario.findUnique({ where: { email: dados.email } });
  if (jaExiste) {
    return Response.json({ erro: "Já existe um usuário com este e-mail" }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(dados.senha, 12);

  const usuario = await prisma.usuario.create({
    data: { nome: dados.nome, email: dados.email, senhaHash, perfil: dados.perfil },
    select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
  });

  return Response.json({ sucesso: true, usuario }, { status: 201 });
}
