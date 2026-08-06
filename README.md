# Agenda Multiweb (CTE / UFSM)

Sistema de Agendamento de Transmissões ao Vivo e Reservas do Mini Auditório (Prédio 14, Sala 109) da Coordenadoria de Tecnologia Educacional (CTE) da Universidade Federal de Santa Maria (UFSM).

---

## 🛠️ Stack Tecnológica

- **Frontend & Backend**: Next.js 16 (App Router, TypeScript)
- **Banco de Dados**: SQLite (via Prisma ORM com adapter LibSQL/Better-SQLite3)
- **Estilização**: CSS Vanilla com Paleta Oficial da UFSM (Verde `#006633` & Azul `#003366`)
- **Autenticação**: NextAuth.js v5 (Credentials Provider + bcrypt)
- **E-mails**: Nodemailer com suporte a threading de e-mail (agrupamento no Gmail via `Message-ID` e `In-Reply-To`)
- **Google Calendar**: Integração com a API do Google Agendas via Service Account
- **Containerização**: Docker (Multi-stage build) & Docker Compose (Pronto para Portainer)

---

## 🔑 Credenciais Padrão (Primeiro Acesso)

- **E-mail**: `cte@ufsm.br`
- **Senha**: `cte@ufsm2024`

> ⚠️ *Recomendamos alterar a senha no painel em Configurações → Alterar Senha após o primeiro acesso.*

---

## 🚀 Como Executar

### 1. Desenvolvimento Local (Node.js)

```bash
# Executar servidor de desenvolvimento
npm run dev
```

Acesse em seu navegador:
- **Página Pública**: [http://localhost:3000](http://localhost:3000)
- **Consulta por Código**: [http://localhost:3000/consultar](http://localhost:3000/consultar)
- **Login da Equipe**: [http://localhost:3000/login](http://localhost:3000/login)

---

### 2. Deploy via Docker / Portainer

```bash
# Copiar arquivo de ambiente
cp .env.example .env

# Subir com Docker Compose
docker-compose up -d --build
```

O container executará automaticamente as migrations do banco de dados e o seed inicial se o banco estiver vazio.
