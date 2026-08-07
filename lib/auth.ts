import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-agenda-multiweb-cte-ufsm-2024",
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH LOG] authorize() chamado com credentials:", {
          email: credentials?.email,
          temSenha: !!credentials?.senha,
        });

        if (!credentials?.email || !credentials?.senha) {
          console.log("[AUTH LOG] Email ou senha vazios.");
          return null;
        }

        const emailStr = String(credentials.email).trim().toLowerCase();
        const senhaStr = String(credentials.senha);

        try {
          const usuario = await prisma.usuario.findFirst({
            where: {
              email: {
                equals: emailStr,
              },
              ativo: true,
            },
          });

          console.log("[AUTH LOG] Busca no banco retornou usuario:", {
            encontrado: !!usuario,
            id: usuario?.id,
            email: usuario?.email,
            ativo: usuario?.ativo,
          });

          if (!usuario) {
            console.log("[AUTH LOG] Usuário não encontrado ou inativo.");
            return null;
          }

          const senhaValida = await bcrypt.compare(senhaStr, usuario.senhaHash);
          console.log("[AUTH LOG] bcrypt.compare resultado:", senhaValida);

          if (!senhaValida) {
            console.log("[AUTH LOG] Senha inválida.");
            return null;
          }

          console.log("[AUTH LOG] Login bem sucedido para:", usuario.email);

          return {
            id: usuario.id,
            name: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil,
          };
        } catch (err) {
          console.error("[AUTH LOG] Erro na consulta do banco:", err);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async redirect({ url }) {
      // Se a URL for relativa (começa com /), retorna como relativa para o navegador usar a origem atual (agenda.cte.edu)
      if (url.startsWith("/")) return url;
      return url;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.perfil = (user as { perfil?: string }).perfil;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { perfil?: string }).perfil = token.perfil as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
