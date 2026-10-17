import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { prisma } from "./lib/prisma";

// ==========================================
// IMPORTAÇÃO DAS ROTAS
// ==========================================

import pacientesRoutes from "./routes/pacientes";
import authRoutes from "./routes/auth";
import psicologosRoutes from "./routes/psicologos";
import adminRoutes from "./routes/admin";
import agendaRoutes from "./routes/agenda";

// ==========================================
// VARIÁVEIS DE AMBIENTE
// ==========================================

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 4000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

// ==========================================
// CONFIGURAÇÃO DO CORS
// ==========================================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ==========================================
// CONFIGURAÇÃO DO EXPRESS
// ==========================================

app.use(express.json({ limit: "100kb" }));

app.use(cookieParser());

// ==========================================
// STATUS DA API
// GET /api/status
// ==========================================

app.get("/api/status", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      name: "SERENVIA API",
      status: "online",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao conectar ao banco:", error);

    return res.status(503).json({
      success: false,
      name: "SERENVIA API",
      status: "online",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// ==========================================
// ROTAS DE PACIENTES
// ==========================================

app.use("/api/pacientes", pacientesRoutes);

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// ROTAS DE PSICÓLOGOS
// ==========================================

app.use("/api/psicologos", psicologosRoutes);

// ==========================================
// ROTAS DE AGENDA DEMONSTRATIVA
// ==========================================

app.use("/api/agenda", agendaRoutes);

// ==========================================
// ROTAS ADMINISTRATIVAS
// ==========================================

app.use("/api/admin", adminRoutes);

// ==========================================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// ==========================================

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Rota não encontrada.",
  });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(`SERENVIA API: http://localhost:${PORT}`);
});