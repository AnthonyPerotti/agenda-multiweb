const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "../data/agenda.db");
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function resetAdmin() {
  const { createClient } = await import("@libsql/client");
  const client = createClient({ url: `file:${dbPath}` });

  const hash = await bcrypt.hash("cte@ufsm2024", 12);
  console.log("Novo hash gerado:", hash);

  // Deletar e recriar para garantir registro limpo
  await client.execute("DELETE FROM Usuario WHERE email = 'cte@ufsm.br'");
  
  const id = "admin_" + Date.now();
  await client.execute({
    sql: "INSERT INTO Usuario (id, nome, email, senhaHash, perfil, ativo, criadoEm, atualizadoEm) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))",
    args: [id, "Equipe CTE", "cte@ufsm.br", hash, "ADMIN"]
  });

  console.log("✅ Usuário cte@ufsm.br resetado com a senha cte@ufsm2024");
  
  // Testar comparação logo em seguida
  const res = await client.execute("SELECT senhaHash FROM Usuario WHERE email = 'cte@ufsm.br'");
  const storedHash = res.rows[0].senhaHash;
  const match = await bcrypt.compare("cte@ufsm2024", String(storedHash));
  console.log("🔍 Teste de validação bcrypt match:", match);

  client.close();
}

resetAdmin().catch(console.error);
