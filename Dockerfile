# ============================================================
# Dockerfile — Agenda Multiweb (CTE/UFSM)
# Otimizado para Next.js 16 + Prisma v7
# ============================================================

# ─── Stage 1: Dependências do Build ──────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar dependências do sistema necessárias para Prisma/bcrypt
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Usar --ignore-scripts para evitar falhas no postinstall durante a cópia inicial
RUN npm install --ignore-scripts

# ─── Stage 2: Builder ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de build (valores temporários; serão sobrescritos no runtime)
ENV DATABASE_URL="file:./data/agenda.db"
ENV AUTH_SECRET="build-placeholder-secret-change-in-production"
ENV NEXT_TELEMETRY_DISABLED=1

# Gerar Prisma Client
RUN npx prisma generate

# Build do Next.js
RUN npm run build

# ─── Stage 3: Runner (Imagem final de produção) ─────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar artefatos do build Next.js standalone e cliente gerado do Prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/app/generated ./app/generated
COPY --from=builder /app/node_modules ./node_modules

# Script de inicialização
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Diretório de dados persistentes
RUN mkdir -p /app/data /app/uploads && chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
