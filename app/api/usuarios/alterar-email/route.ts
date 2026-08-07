import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// POST /api/usuarios/alterar-email
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const schema = z.object({
    novoEmail: z.string().email("Formato de e-mail inválido"),
    senhaAtual: z.string().min(1, "Informe a senha atual para confirmar"),
  });

  const validacao = schema.safeParse(body);
  if (!validacao.success) {
    return Response.json({ erro: validacao.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { novoEmail, senhaAtual } = validacao.data;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
  });

  if (!usuario) return Response.json({ erro: "Usuário não encontrado" }, { status: 404 });

  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
  if (!senhaValida) {
    return Response.json({ erro: "Senha atual incorreta" }, { status: 400 });
  }

  // Verificar se e-mail já está em uso por outro usuário
  const existente = await prisma.usuario.findFirst({
    where: { email: novoEmail.toLowerCase().trim() },
  });

  if (existente && existente.id !== usuario.id) {
    return Response.json({ erro: "Este e-mail já está em uso por outra conta" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { email: novoEmail.toLowerCase().trim() },
  });

  return Response.json({ sucesso: true, mensagem: "E-mail atualizado com sucesso!" });
}
