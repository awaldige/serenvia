import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const MARCADOR = "TESTE_CONCLUSAO_SERENVIA_20261016";

async function main() {
  if (process.env.APP_MODE !== "demo") {
    throw new Error("Este script só pode ser executado em modo demo.");
  }

  const paciente = await prisma.usuario.findFirst({
    where: {
      nome: "Ana Souza",
      tipo: "PACIENTE",
      ativo: true,
    },
  });

  if (!paciente) {
    throw new Error("Paciente demonstrativa Ana Souza não encontrada.");
  }

  const psicologa = await prisma.perfilPsicologo.findFirst({
    where: {
      usuario: {
        nome: "Mariana Oliveira",
        tipo: "PSICOLOGO",
        ativo: true,
      },
      status: "APROVADO",
    },
  });

  if (!psicologa) {
    throw new Error("Psicóloga demonstrativa Mariana Oliveira não encontrada.");
  }

  const existente = await prisma.agendamento.findFirst({
    where: {
      observacao: MARCADOR,
      pacienteId: paciente.id,
      perfilPsicologoId: psicologa.id,
    },
  });

  if (existente) {
    console.log("A consulta de teste já existe.");
    console.log("ID:", existente.id);
    console.log("Status:", existente.status);
    return;
  }

  // Consulta fictícia encerrada há aproximadamente 24 horas.
  const fim = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const inicio = new Date(fim.getTime() - 50 * 60 * 1000);

  const consulta = await prisma.agendamento.create({
    data: {
      pacienteId: paciente.id,
      perfilPsicologoId: psicologa.id,
      inicio,
      fim,
      status: "CONFIRMADO",
      confirmadoEm: new Date(),
      observacao: MARCADOR,
    },
  });

  console.log("Consulta demonstrativa criada com sucesso!");
  console.log("ID:", consulta.id);
  console.log("Início:", consulta.inicio.toISOString());
  console.log("Fim:", consulta.fim.toISOString());
  console.log("Status:", consulta.status);
}

main()
  .catch((error) => {
    console.error("Erro ao criar consulta de teste:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });