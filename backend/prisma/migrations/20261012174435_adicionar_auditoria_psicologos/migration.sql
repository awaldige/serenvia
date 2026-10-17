-- CreateTable
CREATE TABLE "auditoria_psicologos" (
    "id" TEXT NOT NULL,
    "perfilPsicologoId" TEXT NOT NULL,
    "administradorId" TEXT NOT NULL,
    "statusAnterior" "StatusPsicologo" NOT NULL,
    "statusNovo" "StatusPsicologo" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_psicologos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_psicologos_perfilPsicologoId_criadoEm_idx" ON "auditoria_psicologos"("perfilPsicologoId", "criadoEm");

-- CreateIndex
CREATE INDEX "auditoria_psicologos_administradorId_idx" ON "auditoria_psicologos"("administradorId");

-- AddForeignKey
ALTER TABLE "auditoria_psicologos" ADD CONSTRAINT "auditoria_psicologos_perfilPsicologoId_fkey" FOREIGN KEY ("perfilPsicologoId") REFERENCES "perfis_psicologos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_psicologos" ADD CONSTRAINT "auditoria_psicologos_administradorId_fkey" FOREIGN KEY ("administradorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
