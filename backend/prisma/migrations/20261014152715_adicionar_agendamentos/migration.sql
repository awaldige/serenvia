-- ==========================================
-- SERENVIA
-- SISTEMA DE AGENDAMENTOS DEMONSTRATIVOS
-- ==========================================

-- ==========================================
-- 1. CRIAR ENUM DE STATUS
-- ==========================================

CREATE TYPE "StatusAgendamento" AS ENUM (
    'PENDENTE',
    'CONFIRMADO',
    'CANCELADO',
    'CONCLUIDO'
);


-- ==========================================
-- 2. DISPONIBILIDADE DOS PSICOLOGOS
-- ==========================================

CREATE TABLE "disponibilidades_psicologos" (
    "id" TEXT NOT NULL,
    "perfilPsicologoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "inicioMinutos" INTEGER NOT NULL,
    "fimMinutos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilidades_psicologos_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "disponibilidades_dia_semana_valido"
        CHECK ("diaSemana" BETWEEN 0 AND 6),

    CONSTRAINT "disponibilidades_horario_valido"
        CHECK (
            "inicioMinutos" >= 0
            AND "fimMinutos" <= 1440
            AND "inicioMinutos" < "fimMinutos"
        )
);


-- ==========================================
-- 3. BLOQUEIOS DE AGENDA
-- ==========================================

CREATE TABLE "bloqueios_agenda" (
    "id" TEXT NOT NULL,
    "perfilPsicologoId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "motivo" VARCHAR(250),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_agenda_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "bloqueios_intervalo_valido"
        CHECK ("fim" > "inicio")
);


-- ==========================================
-- 4. AGENDAMENTOS DEMONSTRATIVOS
-- ==========================================

CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "perfilPsicologoId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'PENDENTE',
    "observacao" VARCHAR(500),
    "confirmadoEm" TIMESTAMP(3),
    "canceladoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamentos_pkey"
        PRIMARY KEY ("id"),

    CONSTRAINT "agendamentos_intervalo_valido"
        CHECK ("fim" > "inicio")
);


-- ==========================================
-- 5. INDICES DE DISPONIBILIDADE
-- ==========================================

CREATE INDEX
    "disponibilidades_psicologos_perfilPsicologoId_diaSemana_idx"
ON "disponibilidades_psicologos"(
    "perfilPsicologoId",
    "diaSemana"
);

CREATE UNIQUE INDEX
    "disponibilidades_psicologos_perfilPsicologoId_diaSemana_ini_key"
ON "disponibilidades_psicologos"(
    "perfilPsicologoId",
    "diaSemana",
    "inicioMinutos",
    "fimMinutos"
);


-- ==========================================
-- 6. INDICES DE BLOQUEIOS
-- ==========================================

CREATE INDEX
    "bloqueios_agenda_perfilPsicologoId_inicio_fim_idx"
ON "bloqueios_agenda"(
    "perfilPsicologoId",
    "inicio",
    "fim"
);


-- ==========================================
-- 7. INDICES DE AGENDAMENTOS
-- ==========================================

CREATE INDEX
    "agendamentos_pacienteId_inicio_idx"
ON "agendamentos"(
    "pacienteId",
    "inicio"
);

CREATE INDEX
    "agendamentos_perfilPsicologoId_inicio_idx"
ON "agendamentos"(
    "perfilPsicologoId",
    "inicio"
);

CREATE INDEX
    "agendamentos_status_inicio_idx"
ON "agendamentos"(
    "status",
    "inicio"
);


-- ==========================================
-- 8. RELACIONAMENTOS DE DISPONIBILIDADE
-- ==========================================

ALTER TABLE "disponibilidades_psicologos"
ADD CONSTRAINT "disponibilidades_psicologos_perfilPsicologoId_fkey"
FOREIGN KEY ("perfilPsicologoId")
REFERENCES "perfis_psicologos"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ==========================================
-- 9. RELACIONAMENTOS DOS BLOQUEIOS
-- ==========================================

ALTER TABLE "bloqueios_agenda"
ADD CONSTRAINT "bloqueios_agenda_perfilPsicologoId_fkey"
FOREIGN KEY ("perfilPsicologoId")
REFERENCES "perfis_psicologos"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ==========================================
-- 10. RELACIONAMENTO DO PACIENTE
-- ==========================================

ALTER TABLE "agendamentos"
ADD CONSTRAINT "agendamentos_pacienteId_fkey"
FOREIGN KEY ("pacienteId")
REFERENCES "usuarios"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- ==========================================
-- 11. RELACIONAMENTO DO PSICOLOGO
-- ==========================================

ALTER TABLE "agendamentos"
ADD CONSTRAINT "agendamentos_perfilPsicologoId_fkey"
FOREIGN KEY ("perfilPsicologoId")
REFERENCES "perfis_psicologos"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;


-- ==========================================
-- 12. EXTENSAO PARA PROTECAO DE HORARIOS
-- ==========================================

-- Necessaria para utilizar igualdade de TEXT
-- em restricoes de exclusao GiST.

CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ==========================================
-- 13. IMPEDIR AGENDAMENTOS SOBREPOSTOS
-- ==========================================

-- Impede que dois agendamentos ativos
-- ocupem intervalos sobrepostos
-- para o mesmo psicologo ficticio.
--
-- Agendamentos CANCELADOS e CONCLUIDOS
-- nao participam dessa restricao.

ALTER TABLE "agendamentos"
ADD CONSTRAINT "agendamentos_sem_sobreposicao"
EXCLUDE USING gist (
    "perfilPsicologoId" WITH =,
    tsrange("inicio", "fim", '[)') WITH &&
)
WHERE (
    "status" IN (
        'PENDENTE'::"StatusAgendamento",
        'CONFIRMADO'::"StatusAgendamento"
    )
);