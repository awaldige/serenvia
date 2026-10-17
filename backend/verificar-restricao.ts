import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  const resultado = await prisma.$queryRaw<
    { conname: string; definicao: string }[]
  >`
    SELECT
      conname,
      pg_get_constraintdef(oid) AS definicao
    FROM pg_constraint
    WHERE conrelid = 'agendamentos'::regclass
      AND conname = 'agendamentos_sem_sobreposicao'
  `;

  console.log(JSON.stringify(resultado, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
