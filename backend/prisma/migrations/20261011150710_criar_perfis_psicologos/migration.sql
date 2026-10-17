-- CreateEnum
CREATE TYPE "StatusPsicologo" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADO', 'REJEITADO', 'SUSPENSO');

-- CreateTable
CREATE TABLE "perfis_psicologos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "crpNumero" TEXT NOT NULL,
    "crpUf" VARCHAR(2) NOT NULL,
    "telefone" TEXT NOT NULL,
    "biografia" TEXT,
    "especialidade" VARCHAR(200),
    "valorConsulta" DECIMAL(10,2) NOT NULL,
    "status" "StatusPsicologo" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "aprovadoEm" TIMESTAMP(3),

    CONSTRAINT "perfis_psicologos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos_psicologos" (
    "id" TEXT NOT NULL,
    "perfilPsicologoId" TEXT NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enderecos_psicologos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfis_psicologos_usuarioId_key" ON "perfis_psicologos"("usuarioId");

-- CreateIndex
CREATE INDEX "perfis_psicologos_status_idx" ON "perfis_psicologos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_psicologos_crpNumero_crpUf_key" ON "perfis_psicologos"("crpNumero", "crpUf");

-- CreateIndex
CREATE UNIQUE INDEX "enderecos_psicologos_perfilPsicologoId_key" ON "enderecos_psicologos"("perfilPsicologoId");

-- AddForeignKey
ALTER TABLE "perfis_psicologos" ADD CONSTRAINT "perfis_psicologos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos_psicologos" ADD CONSTRAINT "enderecos_psicologos_perfilPsicologoId_fkey" FOREIGN KEY ("perfilPsicologoId") REFERENCES "perfis_psicologos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
