// Seed usando @libsql/client (pure JS, sem binários nativos)
const path = require("path");
const fs = require("fs");
const bcrypt = require("../node_modules/bcryptjs");

const dbPath = path.join(__dirname, "../data/agenda.db");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Importar createClient dinamicamente (ESM)
async function seed() {
  const { createClient } = await import("@libsql/client");
  
  const client = createClient({ url: `file:${dbPath}` });

  console.log("🌱 Iniciando seed do banco de dados...");

  // Verificar se usuário já existe
  const existeResult = await client.execute("SELECT id FROM Usuario WHERE email = 'cte@ufsm.br'");
  
  if (existeResult.rows.length === 0) {
    const hash = await bcrypt.hash("cte@ufsm2024", 12);
    const id = "admin_" + Date.now();
    
    await client.execute({
      sql: "INSERT INTO Usuario (id, nome, email, senhaHash, perfil, ativo, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))",
      args: [id, "Equipe CTE", "cte@ufsm.br", hash, "ADMIN"]
    });
    console.log("✅ Usuário admin criado: cte@ufsm.br");
  } else {
    console.log("ℹ️  Usuário admin já existe");
  }

  const configs = [
    ["site_url", "http://localhost:3000"],
    ["smtp_host", ""], ["smtp_port", "587"], ["smtp_secure", "false"],
    ["smtp_user", ""], ["smtp_pass", ""],
    ["smtp_from_name", "Agenda Multiweb – CTE/UFSM"],
    ["smtp_from_email", ""], ["google_calendar_id", ""], ["google_credentials", ""],
    ["template_confirmacao", ""], ["template_aceite", ""], ["template_recusa", ""], ["template_mensagem", ""],
  ];

  for (const [chave, valor] of configs) {
    const id = "cfg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
    await client.execute({
      sql: "INSERT OR IGNORE INTO Configuracao (id, chave, valor, atualizadoEm) VALUES (?, ?, ?, datetime('now'))",
      args: [id, chave, valor]
    });
  }
  
  console.log("✅ Configurações inicializadas");
  console.log("\n🎉 Seed concluído!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 Login: cte@ufsm.br");
  console.log("🔑 Senha: cte@ufsm2024");
  console.log("⚠️  Altere a senha após o primeiro acesso!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  client.close();
}

seed().catch(e => { console.error("❌ Erro:", e.message); process.exit(1); });
