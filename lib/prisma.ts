import "dotenv/config";
import path from "path";
import fs from "fs";

// Garantir que DATABASE_URL esteja definida e formatada como caminho absoluto VÁLIDO antes da importação do PrismaClient
const dbUrlRaw = process.env.DATABASE_URL || "file:./data/agenda.db";
let urlFinal: string;

if (dbUrlRaw.startsWith("file:")) {
  const dbPath = dbUrlRaw.replace("file:", "");
  const dbPathAbsoluto = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(/*turbopackIgnore: true*/ process.cwd(), dbPath);
  
  const dir = path.dirname(dbPathAbsoluto);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  urlFinal = `file:${dbPathAbsoluto.replace(/\\/g, "/")}`;
} else {
  urlFinal = dbUrlRaw;
}

process.env.DATABASE_URL = urlFinal;

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function criarPrismaClient() {
  const adapter = new PrismaLibSql({ url: urlFinal });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof criarPrismaClient> };

export const prisma = globalForPrisma.prisma ?? criarPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
