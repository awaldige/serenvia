import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  const pacientes = await prisma.usuario.findMany({
    where: {
      tipo: "PACIENTE",
    },
    select: {
      id: true,
      nome: true,
      email: true,
      ativo: true,
      criadoEm: true,
    },
    orderBy: {
      criadoEm: "desc",
    },
  });

  console.log("\n==================================");
  console.log("SERENVIA - PACIENTES CADASTRADOS");
  console.log("==================================\n");

  console.log(
    JSON.stringify(pacientes, null, 2)
  );

  console.log(
    `\nTotal de pacientes: ${pacientes.length}`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
