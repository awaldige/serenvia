import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

// ==========================================
// CADASTRO DE PACIENTES
// POST /api/pacientes/cadastro
// ==========================================

router.post("/cadastro", async (req, res) => {
  try {
    // ======================================
    // RECEBER DADOS DO FORMULÁRIO
    // ======================================

    const { nome, email, senha, confirmarSenha } = req.body ?? {};

    // ======================================
    // VALIDAR TIPOS DOS CAMPOS
    // ======================================

    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string" ||
      typeof confirmarSenha !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Preencha todos os campos corretamente.",
      });
    }

    // ======================================
    // NORMALIZAR NOME E E-MAIL
    // ======================================

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    // ======================================
    // VALIDAR NOME
    // ======================================

    if (nomeLimpo.length < 3 || nomeLimpo.length > 150) {
      return res.status(400).json({
        success: false,
        message: "O nome deve ter entre 3 e 150 caracteres.",
      });
    }

    // ======================================
    // VALIDAR E-MAIL
    // ======================================

    if (
      emailLimpo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Informe um e-mail válido.",
      });
    }

    // ======================================
    // VALIDAR SENHA
    // MÍNIMO: 8 CARACTERES
    // MÁXIMO: 72 CARACTERES
    // ======================================

    if (senha.length < 8 || senha.length > 72) {
      return res.status(400).json({
        success: false,
        message: "A senha deve ter entre 8 e 72 caracteres.",
      });
    }

    // ======================================
    // CONFIRMAR SENHA
    // ======================================

    if (senha !== confirmarSenha) {
      return res.status(400).json({
        success: false,
        message: "As senhas não coincidem.",
      });
    }

    // ======================================
    // CRIPTOGRAFAR SENHA COM BCRYPT
    // ======================================

    const senhaHash = await bcrypt.hash(senha, 12);

    // ======================================
    // CADASTRAR PACIENTE NO NEON
    // ======================================

    const usuario = await prisma.usuario.create({
      data: {
        nome: nomeLimpo,
        email: emailLimpo,
        senhaHash,
        tipo: "PACIENTE",
      },

      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        criadoEm: true,
      },
    });

    // ======================================
    // CADASTRO REALIZADO COM SUCESSO
    // ======================================

    return res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso.",
      usuario,
    });
  } catch (error: unknown) {
    // ======================================
    // TRATAR E-MAIL JÁ CADASTRADO
    // ======================================

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        success: false,
        message: "Este e-mail já está cadastrado.",
      });
    }

    // ======================================
    // TRATAR ERROS INESPERADOS
    // ======================================

    console.error("Erro ao cadastrar paciente:", error);

    return res.status(500).json({
      success: false,
      message: "Não foi possível realizar o cadastro.",
    });
  }
});

export default router;