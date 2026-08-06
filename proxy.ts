import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Proxy para proteger todas as rotas do dashboard e API privada
export async function proxy(request: NextRequest) {
  const session = await auth();

  const { pathname } = request.nextUrl;

  // Proteger rotas do dashboard
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Proteger API routes privadas (exceto auth e públicas)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const rotasPublicas = [
      "/api/tickets",       // POST criar ticket (público)
    ];
    
    // Verificar se é uma rota pública específica (método POST em /api/tickets)
    const ehRotaPublicaPost =
      rotasPublicas.some((r) => pathname === r) && request.method === "POST";
    
    // Rotas de consulta e mensagens públicas por código
    const ehBuscarPublico =
      /^\/api\/tickets\/buscar\/[A-Z0-9-]+$/i.test(pathname) &&
      (request.method === "GET" || request.method === "POST");

    if (!ehRotaPublicaPost && !ehBuscarPublico && !session) {
      return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
    }
  }

  // Redirecionar /login para /dashboard se já autenticado
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard/tickets", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/((?!auth).)*",
    "/login",
  ],
};
