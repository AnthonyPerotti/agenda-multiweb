import { auth } from "@/lib/auth";
import { testarSmtp } from "@/lib/email";
import { z } from "zod";

const schemaTestar = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean(),
  user: z.string().min(1),
  pass: z.string().min(1),
  fromEmail: z.string().email(),
  paraEmail: z.string().email(),
});

// POST /api/configuracoes/testar-smtp
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  const body = await request.json();

  try {
    const dados = schemaTestar.parse(body);
    const resultado = await testarSmtp(dados);

    if (resultado.sucesso) {
      return Response.json({
        sucesso: true,
        mensagem: `E-mail de teste enviado para ${dados.paraEmail}! Verifique sua caixa de entrada.`,
      });
    } else {
      return Response.json(
        { sucesso: false, erro: resultado.erro ?? "Falha ao conectar ao servidor SMTP" },
        { status: 400 }
      );
    }
  } catch (err) {
    return Response.json({ sucesso: false, erro: (err as Error).message }, { status: 400 });
  }
}
