import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

const router = Router();

// ==========================================
// CONFIGURAÇÃO DA AUTENTICAÇÃO
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error("JWT_SECRET não configurado corretamente.");
}

const chaveJwt: string = JWT_SECRET;

// ==========================================
// CONFIGURAÇÃO DO COOKIE
// ==========================================

const COOKIE_NAME = "mente_conecta_token";

const COOKIE_MAX_AGE = 2 * 60 * 60 * 1000;

const COOKIE_SECURE = true;

const COOKIE_SAME_SITE = "lax" as const;
// ==========================================
// LOGIN DE USUÁRIOS
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe seu e-mail e sua senha.",
      });
    }

    const emailLimpo = email.trim().toLowerCase();

    const usuario = await prisma.usuario.findUnique({
      where: {
        email: emailLimpo,
      },
      include: {
        perfilPsicologo: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha inválidos.",
      });
    }

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senhaHash
    );

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: "E-mail ou senha inválidos.",
      });
    }

    const token = jwt.sign(
      {
        sub: usuario.id,
        tipo: usuario.tipo,
      },
      chaveJwt,
      {
        expiresIn: "2h",
        algorithm: "HS256",
      }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso.",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        statusPsicologo:
          usuario.tipo === "PSICOLOGO"
            ? usuario.perfilPsicologo?.status ?? null
            : null,
      },
    });
  } catch (error) {
    console.error("Erro ao realizar login:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível realizar o login.",
    });
  }
});

// ==========================================
// VERIFICAR SESSÃO DO USUÁRIO
// GET /api/auth/me
// ==========================================

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token || typeof token !== "string") {
      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado.",
      });
    }

    let payload: jwt.JwtPayload | string;

    try {
      payload = jwt.verify(token, chaveJwt, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Sessão inválida ou expirada.",
      });
    }

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Sessão inválida.",
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        perfilPsicologo: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        success: false,
        message: "Usuário não autorizado.",
      });
    }

    return res.status(200).json({
      success: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        statusPsicologo:
          usuario.tipo === "PSICOLOGO"
            ? usuario.perfilPsicologo?.status ?? null
            : null,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível verificar a sessão.",
    });
  }
});

// ==========================================
// LOGOUT DE USUÁRIOS
// POST /api/auth/logout
// ==========================================

router.post("/logout", (req, res) => {
  try {
    const origin = req.get("origin");

    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:3000";

    if (origin !== frontendUrl) {
      return res.status(403).json({
        success: false,
        message: "Origem não autorizada.",
      });
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Logout realizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao realizar logout:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível realizar o logout.",
    });
  }
});

export default router;