import { auth } from "@/lib/auth";
import { google } from "googleapis";

// POST /api/configuracoes/testar-google — testar credenciais e acesso ao Google Calendar
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ erro: "Não autorizado" }, { status: 401 });

  try {
    const body = await request.json();
    const { calendarId, credentialsJson, impersonatedEmail } = body;

    if (!calendarId || !credentialsJson) {
      return Response.json(
        { sucesso: false, erro: "Informe o ID da Agenda e cole as credenciais JSON" },
        { status: 400 }
      );
    }

    let credentials;
    try {
      credentials = typeof credentialsJson === "string" ? JSON.parse(credentialsJson) : credentialsJson;
    } catch {
      return Response.json(
        { sucesso: false, erro: "O conteúdo das credenciais não é um JSON válido" },
        { status: 400 }
      );
    }

    const authClient = new google.auth.GoogleAuth({
      credentials,
      clientOptions: impersonatedEmail?.trim() ? { subject: impersonatedEmail.trim() } : undefined,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth: authClient });

    // Verificar permissoes da Service Account na agenda (writer ou owner)
    const calList = await calendar.calendarList.get({ calendarId });
    const accessRole = calList.data.accessRole;

    if (accessRole !== "writer" && accessRole !== "owner") {
      return Response.json({
        sucesso: false,
        erro: `A Service Account possui apenas permissão de LEITURA (accessRole: ${accessRole}). No Google Calendar, altere a permissão compartilhada para 'Fazer alterações nos eventos'.`,
      });
    }

    return Response.json({
      sucesso: true,
      mensagem: `Conexão estabelecida com sucesso! A agenda "${calList.data.summary || calendarId}" foi acessada com permissão de ESCRITA (escrita liberada). 🎉`,
    });
  } catch (err) {
    const errorMsg = (err as Error).message || "Erro desconhecido ao conectar";
    console.error("[Testar Google Calendar] Erro:", err);

    let orientacao = "";
    if (errorMsg.includes("404") || errorMsg.includes("Not Found")) {
      orientacao = "Verifique se o ID da agenda está correto e se você compartilhou a agenda com o e-mail da Service Account.";
    } else if (errorMsg.includes("403") || errorMsg.includes("forbidden") || errorMsg.includes("permission")) {
      orientacao = "A Service Account não tem permissão de acesso. No Google Calendar, adicione o e-mail client_email da Service Account com permissão de 'Fazer alterações nos eventos'.";
    }

    return Response.json({
      sucesso: false,
      erro: `${errorMsg}${orientacao ? ` — ${orientacao}` : ""}`,
    });
  }
}
