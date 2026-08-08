# Agenda Multiweb (CTE / UFSM)

Sistema de Agendamento de Transmissões ao Vivo e Reservas do Mini Auditório (Prédio 14, Sala 109) da Coordenadoria de Tecnologia Educacional (CTE) da Universidade Federal de Santa Maria (UFSM).

---

## 🛠️ Stack Tecnológica

- **Frontend & Backend**: Next.js 16 (App Router, React 19, TypeScript)
- **Banco de Dados**: SQLite (via Prisma ORM 7 com adapter LibSQL/Better-SQLite3)
- **Estilização**: CSS Vanilla com Paleta Oficial da UFSM (Verde `#006633` & Azul `#003366`)
- **Autenticação**: NextAuth.js v5 (Credentials Provider + bcrypt)
- **E-mails**: Nodemailer com agrupamento por Threading via `Message-ID` e `In-Reply-To`
- **Google Calendar**: Sincronização automática via Service Account API + Link direto para agendamento pessoal em nova aba
- **Relatórios & PDF**: Exportação estilizada em PDF (`html2pdf.js`) e Excel (`xlsx`)
- **Containerização**: Docker (Multi-stage build) & Docker Compose (Pronto para Portainer)

---

## ✨ Principais Funcionalidades

### 📅 Solicitação e Agendamento
- **Múltiplos Dias**: Suporte a escolha de múltiplos dias/horários para o mesmo evento.
- **Validação de Antecedência**: Regras configuráveis de antecedência mínima (ex: 48 horas) para envio de solicitações.
- **Detecção de Conflitos**: Checagem em tempo real de choques de horário na agenda da CTE.
- **Adicionar à Agenda**: Botão "Adicionar à minha Agenda" que abre o formulário pré-preenchido no Google Calendar em nova aba.

### ✉️ Notificações e Mensagens por E-mail
- **Thread Única por Ticket**: Todos os e-mails (abertura, aceite, mensagens e encerramento) pertencem à mesma conversa no Gmail/Outlook.
- **Lembretes Automáticos**: Lembretes pré-evento configuráveis e alternáveis individualmente para a equipe e para o solicitante.
- **Chat do Chamado**: Comunicação em tempo real entre solicitante e equipe CTE com registro no histórico.

### 📊 Painel Administrativo e Relatórios
- **Gestão de Tickets**: Dashboard completo com filtros por status, tipo e código.
- **Relatórios Gerenciais**: Filtro de solicitações (inclusive eventos de Colação/Formatura criados pela equipe), gráfico mensal de uso e estatísticas.
- **Exportação Estilizada**: Geração de relatórios e Comprovantes Oficiais de Reserva em PDF timbrado UFSM e Excel (.xlsx).
- **Histórico Completo**: Visualização das mensagens e ações tomadas em cada chamado.

### ⚙️ Configurações e Segurança
- **Backup & Restauração**: Download do banco de dados e restauração de backups diretamente pela interface.
- **Gestão de Usuários**: Cadastro de equipe, alteração de e-mail e redefinição de senha com hash `bcrypt`.

---

## 🔑 Credenciais Padrão (Primeiro Acesso)

- **E-mail**: `cte@ufsm.br`
- **Senha**: `cte@ufsm2024`

> ⚠️ *Recomendamos alterar a senha no painel em Configurações → Alterar Senha após o primeiro acesso.*

---

## 🚀 Como Executar

### 1. Desenvolvimento Local (Node.js)

```bash
# Instalar dependências
npm install

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

# Subir os containers com Docker Compose
docker-compose up -d --build
```

O container executará automaticamente as migrations do banco de dados e o seed inicial se o banco estiver vazio.
