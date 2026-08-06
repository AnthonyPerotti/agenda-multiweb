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

# Executar seed apenas se o banco estiver vazio (primeira execução)
USER_COUNT=$(node -e "
const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();
prisma.usuario.count().then(n => { console.log(n); prisma.\$disconnect(); });
")

if [ "$USER_COUNT" = "0" ]; then
  echo "🌱 Executando seed inicial..."
  node -e "
  const { PrismaClient } = require('./app/generated/prisma');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();
  
  async function seed() {
    const hash = await bcrypt.hash('cte@ufsm2024', 12);
    await prisma.usuario.create({
      data: { nome: 'Equipe CTE', email: 'cte@ufsm.br', senhaHash: hash, perfil: 'ADMIN' }
    });
    
    const configs = [
      { chave: 'site_url', valor: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' },
      { chave: 'smtp_host', valor: '' }, { chave: 'smtp_port', valor: '587' },
      { chave: 'smtp_secure', valor: 'false' }, { chave: 'smtp_user', valor: '' },
      { chave: 'smtp_pass', valor: '' },
      { chave: 'smtp_from_name', valor: 'Agenda Multiweb - CTE/UFSM' },
      { chave: 'smtp_from_email', valor: '' },
      { chave: 'google_calendar_id', valor: '' }, { chave: 'google_credentials', valor: '' },
      { chave: 'template_confirmacao', valor: '' }, { chave: 'template_aceite', valor: '' },
      { chave: 'template_recusa', valor: '' }, { chave: 'template_mensagem', valor: '' },
    ];
    
    for (const c of configs) {
      await prisma.configuracao.upsert({ where: { chave: c.chave }, update: {}, create: c });
    }
    await prisma.\$disconnect();
    console.log('✅ Seed concluído');
  }
  
  seed().catch(e => { console.error(e); process.exit(1); });
  "
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📧 Login padrão: cte@ufsm.br"
  echo "🔑 Senha padrão: cte@ufsm2024"
  echo "⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo "✅ Iniciando servidor Next.js na porta 3000..."
exec node server.js
