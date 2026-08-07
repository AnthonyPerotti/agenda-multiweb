#!/bin/sh
# ============================================================
# docker-entrypoint.sh — Inicialização do container
# ============================================================
set -e

echo "🚀 Agenda Multiweb — CTE/UFSM"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Aplicar migrations do banco de dados
echo "📦 Aplicando migrations do banco de dados..."
npx prisma migrate deploy

# Executar seed seguro via LibSQL
echo "🌱 Verificando/inicializando dados padrão..."
node prisma/seed.cjs

echo "✅ Iniciando servidor Next.js na porta 3000..."
exec node server.js
