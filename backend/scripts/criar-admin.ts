import "dotenv/config";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { prisma } from "../src/lib/prisma";

// ==========================================
// CRIAR ADMINISTRADOR
// ==========================================

async function main() {
  const rl = createInterface({
    input,
    output,
  });

  try {
    console.log("\n====================================");
    console.log("MENTE CONECTA");
    console.log("CRIAR ADMINISTRADOR");
    console.log("====================================\n");

    // ==========================================
    // SOLICITAR DADOS
    // ==========================================

    const nome = (
      await rl.question("Nome do administrador: ")
    ).trim();

    const email = (
      await rl.question("E-mail do administrador: ")
    )
      .trim()
      .toLowerCase();

    // ==========================================
    // VALIDAR NOME
    // ==========================================

    if (nome.length < 3 || nome.length > 120) {
      throw new Error(
        "O nome deve conter entre 3 e 120 caracteres."
      );
    }

    // ==========================================
    // VALIDAR E-MAIL
    // ==========================================

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    // ==========================================
    // VERIFICAR E-MAIL EXISTENTE
    // ==========================================

    const usuarioExistente = await prisma.usuario.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (usuarioExistente) {
      throw new Error(
        "Este e-mail já está cadastrado. Nenhuma alteração foi realizada."
      );
    }

    // ==========================================
    // SOLICITAR SENHA
    // ==========================================

    console.log(
      "\nATENÇÃO: A senha ficará visível durante a digitação."
    );

    const senha = await rl.question(
      "Senha do administrador (mínimo 8 caracteres): "
    );

    // ==========================================
    // VALIDAR SENHA
    // ==========================================

    if (senha.length < 8 || senha.length > 72) {
      throw new Error(
        "A senha deve conter entre 8 e 72 caracteres."
      );
    }

    // ==========================================
    // PROTEGER SENHA COM BCRYPT
    // ==========================================

    const senhaHash = await bcrypt.hash(senha, 12);

    // ==========================================
    // CRIAR ADMINISTRADOR
    // ==========================================

    const administrador = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        tipo: "ADMIN",
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
      },
    });

    // ==========================================
    // RESULTADO
    // ==========================================

    console.log("\n====================================");
    console.log("ADMINISTRADOR CRIADO COM SUCESSO!");
    console.log("====================================\n");

    console.log(`Nome: ${administrador.nome}`);
    console.log(`E-mail: ${administrador.email}`);
    console.log(`Tipo: ${administrador.tipo}`);

    console.log(
      "\nO administrador já pode utilizar o sistema de login."
    );
  } catch (error) {
    console.error(
      "\nErro:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido."
    );

    process.exitCode = 1;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Erro inesperado:", error);
  process.exitCode = 1;
});