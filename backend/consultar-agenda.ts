import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  const profissionais = await prisma.perfilPsicologo.findMany({
    where: {
      status: "APROVADO",
      usuario: {
        ativo: true,
      },
    },
    select: {
      id: true,
      usuario: {
        select: {
          nome: true,
        },
      },
      disponibilidades: {
        where: {
          ativo: true,
        },
        select: {
          diaSemana: true,
          inicioMinutos: true,
          fimMinutos: true,
        },
      },
    },
  });

  console.log(JSON.stringify(profissionais, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
