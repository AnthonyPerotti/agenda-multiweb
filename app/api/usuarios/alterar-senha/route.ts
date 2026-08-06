import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

// POST /api/usuarios/alterar-senha
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const schema = z.object({
    senhaAtual: z.string().min(1),
    novaSenha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  });

  const dados = schema.parse(body);

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
  });

  if (!usuario) return Response.json({ erro: "Usuário não encontrado" }, { status: 404 });

  const senhaValida = await bcrypt.compare(dados.senhaAtual, usuario.senhaHash);
  if (!senhaValida) {
    return Response.json({ erro: "Senha atual incorreta" }, { status: 400 });
  }

  const novaSenhaHash = await bcrypt.hash(dados.novaSenha, 12);
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { senhaHash: novaSenhaHash },
  });

  return Response.json({ sucesso: true });
}
