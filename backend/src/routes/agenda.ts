import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

const COOKIE_NAME = "mente_conecta_token";

const DURACAO_CONSULTA = 50;
const INTERVALO_CONSULTA = 10;
const PASSO_AGENDA = DURACAO_CONSULTA + INTERVALO_CONSULTA;

const MINUTO_MS = 60 * 1000;

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function erro(
  res: Response,
  status: number,
  message: string
) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function modoDemonstracaoAtivo(): boolean {
  return process.env.APP_MODE === "demo";
}

function origemPermitida(req: Request): boolean {
  const origem = req.headers.origin;
  const frontendUrl = process.env.FRONTEND_URL;

  if (typeof origem !== "string" || !frontendUrl) {
    return false;
  }

  try {
    return (
      new URL(origem).origin ===
      new URL(frontendUrl).origin
    );
  } catch {
    return false;
  }
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

function obterUsuarioId(
  req: Request,
  res: Response
): string | null {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== "string" || !token) {
    erro(res, 401, "Você precisa estar autenticado.");
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    erro(res, 500, "Erro de configuração do servidor.");
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !decoded.sub
    ) {
      erro(res, 401, "Sessão inválida.");
      return null;
    }

    return decoded.sub;
  } catch {
    erro(res, 401, "Sessão inválida ou expirada.");
    return null;
  }
}

// ==========================================
// AUTENTICAÇÃO DO PSICÓLOGO
// ==========================================

async function autenticarPsicologo(
  req: Request,
  res: Response
): Promise<string | null> {
  const usuarioId = obterUsuarioId(req, res);

  if (!usuarioId) return null;

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      id: true,
      tipo: true,
      ativo: true,
      perfilPsicologo: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (
    !usuario ||
    !usuario.ativo ||
    usuario.tipo !== "PSICOLOGO"
  ) {
    erro(res, 403, "Acesso não autorizado.");
    return null;
  }

  if (
    !usuario.perfilPsicologo ||
    usuario.perfilPsicologo.status !== "APROVADO"
  ) {
    erro(
      res,
      403,
      "Recurso disponível somente para perfis aprovados na demonstração."
    );

    return null;
  }

  return usuario.perfilPsicologo.id;
}

// ==========================================
// AUTENTICAÇÃO DO PACIENTE
// ==========================================

async function autenticarPaciente(
  req: Request,
  res: Response
): Promise<string | null> {
  const usuarioId = obterUsuarioId(req, res);

  if (!usuarioId) return null;

  const usuario = await prisma.usuario.findUnique({
    where: {
      id: usuarioId,
    },
    select: {
      id: true,
      tipo: true,
      ativo: true,
    },
  });

  if (
    !usuario ||
    !usuario.ativo ||
    usuario.tipo !== "PACIENTE"
  ) {
    erro(
      res,
      403,
      "Somente pacientes demonstrativos podem acessar este recurso."
    );

    return null;
  }

  return usuario.id;
}

// ==========================================
// FUNÇÕES DE DATA
// ==========================================

// O projeto utiliza o horário de São Paulo,
// UTC-03:00, em seu ambiente demonstrativo.

function criarDataUTC(
  data: string,
  minutos: number
): Date {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  const horarioLocal =
    `${data}T${String(horas).padStart(2, "0")}:` +
    `${String(mins).padStart(2, "0")}:00-03:00`;

  return new Date(horarioLocal);
}

function obterDadosLocais(dataUTC: Date) {
  const dataLocal = new Date(
    dataUTC.getTime() - 3 * 60 * MINUTO_MS
  );

  return {
    diaSemana: dataLocal.getUTCDay(),
    inicioMinutos:
      dataLocal.getUTCHours() * 60 +
      dataLocal.getUTCMinutes(),
  };
}

function dataCalendarioValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return false;
  }

  const referencia = new Date(`${data}T12:00:00Z`);

  return (
    !Number.isNaN(referencia.getTime()) &&
    referencia.toISOString().slice(0, 10) === data
  );
}

// ==========================================
// GET /api/agenda/disponibilidades
// ==========================================

router.get("/disponibilidades", async (req, res) => {
  try {
    if (!modoDemonstracaoAtivo()) {
      return erro(
        res,
        403,
        "Recurso disponível somente no modo demo."
      );
    }

    const perfilId = await autenticarPsicologo(req, res);

    if (!perfilId) return;

    const disponibilidades =
      await prisma.disponibilidadePsicologo.findMany({
        where: {
          perfilPsicologoId: perfilId,
        },
        orderBy: [
          { diaSemana: "asc" },
          { inicioMinutos: "asc" },
        ],
      });

    return res.json({
      success: true,
      modoDemonstracao: true,
      disponibilidades,
    });
  } catch (error) {
    console.error(
      "Erro ao consultar disponibilidades:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível consultar as disponibilidades."
    );
  }
});

// ==========================================
// POST /api/agenda/disponibilidades
// ==========================================

router.post("/disponibilidades", async (req, res) => {
  try {
    if (!modoDemonstracaoAtivo()) {
      return erro(
        res,
        403,
        "Recurso disponível somente no modo demo."
      );
    }

    if (!origemPermitida(req)) {
      return erro(res, 403, "Origem não permitida.");
    }

    const perfilId = await autenticarPsicologo(req, res);

    if (!perfilId) return;

    const {
      diaSemana,
      inicioMinutos,
      fimMinutos,
    } = req.body ?? {};

    if (
      !Number.isInteger(diaSemana) ||
      diaSemana < 0 ||
      diaSemana > 6 ||
      !Number.isInteger(inicioMinutos) ||
      !Number.isInteger(fimMinutos) ||
      inicioMinutos < 0 ||
      fimMinutos > 1440 ||
      inicioMinutos >= fimMinutos
    ) {
      return erro(
        res,
        400,
        "Informe um dia e intervalo de horários válidos."
      );
    }

    const conflito =
      await prisma.disponibilidadePsicologo.findFirst({
        where: {
          perfilPsicologoId: perfilId,
          diaSemana,
          inicioMinutos: {
            lt: fimMinutos,
          },
          fimMinutos: {
            gt: inicioMinutos,
          },
        },
      });

    if (conflito) {
      return erro(
        res,
        409,
        "Já existe uma disponibilidade que ocupa esse horário."
      );
    }

    const disponibilidade =
      await prisma.disponibilidadePsicologo.create({
        data: {
          perfilPsicologoId: perfilId,
          diaSemana,
          inicioMinutos,
          fimMinutos,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Disponibilidade cadastrada com sucesso.",
      modoDemonstracao: true,
      disponibilidade,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return erro(
        res,
        409,
        "Essa disponibilidade já está cadastrada."
      );
    }

    console.error(
      "Erro ao cadastrar disponibilidade:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível cadastrar a disponibilidade."
    );
  }
});

// ==========================================
// DELETE /api/agenda/disponibilidades/:id
// ==========================================

router.delete(
  "/disponibilidades/:id",
  async (req, res) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      if (!origemPermitida(req)) {
        return erro(res, 403, "Origem não permitida.");
      }

      const perfilId = await autenticarPsicologo(
        req,
        res
      );

      if (!perfilId) return;

      const id = req.params.id;

      if (typeof id !== "string" || !id) {
        return erro(
          res,
          400,
          "Identificador inválido."
        );
      }

      const resultado =
        await prisma.disponibilidadePsicologo.deleteMany({
          where: {
            id,
            perfilPsicologoId: perfilId,
          },
        });

      if (resultado.count === 0) {
        return erro(
          res,
          404,
          "Disponibilidade não encontrada."
        );
      }

      return res.json({
        success: true,
        message: "Disponibilidade removida com sucesso.",
        modoDemonstracao: true,
      });
    } catch (error) {
      console.error(
        "Erro ao remover disponibilidade:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível remover a disponibilidade."
      );
    }
  }
);

// ==========================================
// GET /api/agenda/horarios
// ==========================================

router.get("/horarios", async (req, res) => {
  try {
    if (!modoDemonstracaoAtivo()) {
      return erro(
        res,
        403,
        "Recurso disponível somente no modo demo."
      );
    }

    const { perfilPsicologoId, data } = req.query;

    if (
      typeof perfilPsicologoId !== "string" ||
      !perfilPsicologoId ||
      typeof data !== "string" ||
      !dataCalendarioValida(data)
    ) {
      return erro(
        res,
        400,
        "Informe o psicólogo e uma data válida (AAAA-MM-DD)."
      );
    }

    const dataReferencia = new Date(
      `${data}T12:00:00Z`
    );

    const diaSemana = dataReferencia.getUTCDay();

    const perfil = await prisma.perfilPsicologo.findFirst({
      where: {
        id: perfilPsicologoId,
        status: "APROVADO",
        usuario: {
          ativo: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (!perfil) {
      return erro(
        res,
        404,
        "Profissional demonstrativo não encontrado."
      );
    }

    const disponibilidades =
      await prisma.disponibilidadePsicologo.findMany({
        where: {
          perfilPsicologoId,
          diaSemana,
          ativo: true,
        },
        orderBy: {
          inicioMinutos: "asc",
        },
      });

    const inicioDia = new Date(
      `${data}T00:00:00-03:00`
    );

    const fimDia = new Date(
      inicioDia.getTime() + 24 * 60 * MINUTO_MS
    );

    const [agendamentos, bloqueios] =
      await Promise.all([
        prisma.agendamento.findMany({
          where: {
            perfilPsicologoId,
            status: {
              in: ["PENDENTE", "CONFIRMADO"],
            },
            inicio: {
              lt: fimDia,
            },
            fim: {
              gt: inicioDia,
            },
          },
          select: {
            inicio: true,
            fim: true,
          },
        }),

        prisma.bloqueioAgenda.findMany({
          where: {
            perfilPsicologoId,
            inicio: {
              lt: fimDia,
            },
            fim: {
              gt: inicioDia,
            },
          },
          select: {
            inicio: true,
            fim: true,
          },
        }),
      ]);

    const horarios: {
      inicio: string;
      fim: string;
    }[] = [];

    const agora = new Date();

    for (const disponibilidade of disponibilidades) {
      for (
        let minutos = disponibilidade.inicioMinutos;
        minutos + DURACAO_CONSULTA <=
        disponibilidade.fimMinutos;
        minutos += PASSO_AGENDA
      ) {
        const inicio = criarDataUTC(
          data,
          minutos
        );

        const fim = new Date(
          inicio.getTime() +
            DURACAO_CONSULTA * MINUTO_MS
        );

        if (inicio <= agora) {
          continue;
        }

        const margem =
          INTERVALO_CONSULTA * MINUTO_MS;

        const conflitoAgendamento =
          agendamentos.some((agendamento) => {
            const inicioOcupado = new Date(
              agendamento.inicio.getTime() - margem
            );

            const fimOcupado = new Date(
              agendamento.fim.getTime() + margem
            );

            return (
              inicio < fimOcupado &&
              fim > inicioOcupado
            );
          });

        if (conflitoAgendamento) {
          continue;
        }

        const conflitoBloqueio =
          bloqueios.some(
            (bloqueio) =>
              inicio < bloqueio.fim &&
              fim > bloqueio.inicio
          );

        if (conflitoBloqueio) {
          continue;
        }

        horarios.push({
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
        });
      }
    }

    return res.json({
      success: true,
      modoDemonstracao: true,
      perfilPsicologoId,
      data,
      duracaoMinutos: DURACAO_CONSULTA,
      intervaloMinutos: INTERVALO_CONSULTA,
      horarios,
    });
  } catch (error) {
    console.error(
      "Erro ao consultar horários disponíveis:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível consultar os horários disponíveis."
    );
  }
});

// ==========================================
// POST /api/agenda/agendamentos
// ==========================================

router.post("/agendamentos", async (req, res) => {
  try {
    if (!modoDemonstracaoAtivo()) {
      return erro(
        res,
        403,
        "Recurso disponível somente no modo demo."
      );
    }

    if (!origemPermitida(req)) {
      return erro(
        res,
        403,
        "Origem não permitida."
      );
    }

    const pacienteId = await autenticarPaciente(
      req,
      res
    );

    if (!pacienteId) return;

    const {
      perfilPsicologoId,
      inicio,
      observacao,
    } = req.body ?? {};

    if (
      typeof perfilPsicologoId !== "string" ||
      !perfilPsicologoId ||
      typeof inicio !== "string"
    ) {
      return erro(
        res,
        400,
        "Informe o psicólogo e o horário desejado."
      );
    }

    if (
      observacao !== undefined &&
      (
        typeof observacao !== "string" ||
        observacao.length > 500
      )
    ) {
      return erro(
        res,
        400,
        "Observação inválida."
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(
        inicio
      )
    ) {
      return erro(
        res,
        400,
        "Informe um horário válido no formato ISO UTC."
      );
    }

    const inicioConsulta = new Date(inicio);

    if (Number.isNaN(inicioConsulta.getTime())) {
      return erro(
        res,
        400,
        "Data ou horário inválido."
      );
    }

    if (inicioConsulta <= new Date()) {
      return erro(
        res,
        400,
        "Selecione um horário futuro."
      );
    }

    const fimConsulta = new Date(
      inicioConsulta.getTime() +
        DURACAO_CONSULTA * MINUTO_MS
    );

    const perfil =
      await prisma.perfilPsicologo.findFirst({
        where: {
          id: perfilPsicologoId,
          status: "APROVADO",
          usuario: {
            ativo: true,
          },
        },
        select: {
          id: true,
        },
      });

    if (!perfil) {
      return erro(
        res,
        404,
        "Profissional demonstrativo não encontrado."
      );
    }

    const {
      diaSemana,
      inicioMinutos,
    } = obterDadosLocais(inicioConsulta);

    const fimMinutos =
      inicioMinutos + DURACAO_CONSULTA;

    const disponibilidades =
      await prisma.disponibilidadePsicologo.findMany({
        where: {
          perfilPsicologoId,
          diaSemana,
          ativo: true,
          inicioMinutos: {
            lte: inicioMinutos,
          },
          fimMinutos: {
            gte: fimMinutos,
          },
        },
      });

    const disponibilidade =
      disponibilidades.find((item) => {
        const deslocamento =
          inicioMinutos - item.inicioMinutos;

        return (
          deslocamento >= 0 &&
          deslocamento % PASSO_AGENDA === 0
        );
      });

    if (!disponibilidade) {
      return erro(
        res,
        409,
        "O horário não está disponível na agenda do profissional."
      );
    }

    const margem =
      INTERVALO_CONSULTA * MINUTO_MS;

    const resultado = await prisma.$transaction(
      async (tx) => {
        // pg_advisory_xact_lock retorna void.
        // A expressão IS NULL converte
        // o retorno em boolean para o Prisma.

        await tx.$queryRaw<{ bloqueio: boolean }[]>`
          SELECT
            pg_advisory_xact_lock(
              hashtext(${perfilPsicologoId})
            ) IS NULL AS bloqueio
        `;

        const perfilAtual =
          await tx.perfilPsicologo.findFirst({
            where: {
              id: perfilPsicologoId,
              status: "APROVADO",
              usuario: {
                ativo: true,
              },
            },
            select: {
              id: true,
            },
          });

        if (!perfilAtual) {
          return {
            conflito: true as const,
            agendamento: null,
          };
        }

        const disponibilidadesAtuais =
          await tx.disponibilidadePsicologo.findMany({
            where: {
              perfilPsicologoId,
              diaSemana,
              ativo: true,
              inicioMinutos: {
                lte: inicioMinutos,
              },
              fimMinutos: {
                gte: fimMinutos,
              },
            },
          });

        const disponibilidadeAtual =
          disponibilidadesAtuais.some((item) => {
            const deslocamento =
              inicioMinutos - item.inicioMinutos;

            return (
              deslocamento >= 0 &&
              deslocamento % PASSO_AGENDA === 0
            );
          });

        if (!disponibilidadeAtual) {
          return {
            conflito: true as const,
            agendamento: null,
          };
        }

        const bloqueioAtual =
          await tx.bloqueioAgenda.findFirst({
            where: {
              perfilPsicologoId,
              inicio: {
                lt: fimConsulta,
              },
              fim: {
                gt: inicioConsulta,
              },
            },
          });

        if (bloqueioAtual) {
          return {
            conflito: true as const,
            agendamento: null,
          };
        }

        const conflitoAtual =
          await tx.agendamento.findFirst({
            where: {
              perfilPsicologoId,
              status: {
                in: ["PENDENTE", "CONFIRMADO"],
              },
              inicio: {
                lt: new Date(
                  fimConsulta.getTime() + margem
                ),
              },
              fim: {
                gt: new Date(
                  inicioConsulta.getTime() - margem
                ),
              },
            },
          });

        if (conflitoAtual) {
          return {
            conflito: true as const,
            agendamento: null,
          };
        }

        const agendamentoCriado =
          await tx.agendamento.create({
            data: {
              pacienteId,
              perfilPsicologoId,
              inicio: inicioConsulta,
              fim: fimConsulta,
              status: "PENDENTE",
              observacao:
                typeof observacao === "string"
                  ? observacao.trim()
                  : null,
            },
            select: {
              id: true,
              inicio: true,
              fim: true,
              status: true,
              criadoEm: true,
            },
          });

        return {
          conflito: false as const,
          agendamento: agendamentoCriado,
        };
      },
      {
        maxWait: 10000,
        timeout: 15000,
      }
    );

    if (
      resultado.conflito ||
      !resultado.agendamento
    ) {
      return erro(
        res,
        409,
        "Horário indisponível. Escolha outro."
      );
    }

    return res.status(201).json({
      success: true,
      modoDemonstracao: true,
      message:
        "Agendamento demonstrativo criado com sucesso.",
      agendamento: resultado.agendamento,
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      (
        error.code === "P2002" ||
        (
          error.code === "P2010" &&
          error.meta?.code === "23P01"
        )
      )
    ) {
      return erro(
        res,
        409,
        "Horário indisponível. Escolha outro."
      );
    }

    console.error(
      "Erro ao criar agendamento:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível criar o agendamento demonstrativo."
    );
  }
});

// ==========================================
// GET /api/agenda/meus-agendamentos
// ==========================================

router.get("/meus-agendamentos", async (req, res) => {
  try {
    if (!modoDemonstracaoAtivo()) {
      return erro(
        res,
        403,
        "Recurso disponível somente no modo demo."
      );
    }

    const pacienteId = await autenticarPaciente(
      req,
      res
    );

    if (!pacienteId) return;

    const agendamentos =
      await prisma.agendamento.findMany({
        where: {
          pacienteId,
        },
        select: {
          id: true,
          inicio: true,
          fim: true,
          status: true,
          criadoEm: true,
          perfilPsicologoId: true,
        },
        orderBy: [
          {
            inicio: "asc",
          },
        ],
      });

    return res.json({
      success: true,
      modoDemonstracao: true,
      total: agendamentos.length,
      agendamentos,
    });
  } catch (error) {
    console.error(
      "Erro ao consultar agendamentos do paciente:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível consultar seus agendamentos."
    );
  }
});

// ==========================================
// GET /api/agenda/psicologo/agendamentos
// ==========================================

router.get(
  "/psicologo/agendamentos",
  async (req: Request, res: Response) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      const perfilId = await autenticarPsicologo(
        req,
        res
      );

      if (!perfilId) return;

      const agendamentos =
        await prisma.agendamento.findMany({
          where: {
            perfilPsicologoId: perfilId,
          },
          select: {
            id: true,
            inicio: true,
            fim: true,
            status: true,
            observacao: true,
            confirmadoEm: true,
            canceladoEm: true,
            concluidoEm: true,
            criadoEm: true,
            paciente: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: [
            {
              inicio: "asc",
            },
          ],
        });

      return res.json({
        success: true,
        modoDemonstracao: true,
        total: agendamentos.length,
        agendamentos,
      });
    } catch (error) {
      console.error(
        "Erro ao consultar agendamentos do psicólogo:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível consultar os agendamentos."
      );
    }
  }
);

// ==========================================
// PATCH /api/agenda/psicologo/agendamentos/:id/confirmar
// ==========================================

router.patch(
  "/psicologo/agendamentos/:id/confirmar",
  async (req: Request, res: Response) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      if (!origemPermitida(req)) {
        return erro(
          res,
          403,
          "Origem não permitida."
        );
      }

      const perfilId = await autenticarPsicologo(
        req,
        res
      );

      if (!perfilId) return;

      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return erro(
          res,
          400,
          "Identificador do agendamento inválido."
        );
      }

      // Atualização condicional:
      // somente agendamentos futuros,
      // pendentes e pertencentes ao psicólogo.

      const resultado =
        await prisma.agendamento.updateMany({
          where: {
            id,
            perfilPsicologoId: perfilId,
            status: "PENDENTE",
            inicio: {
              gt: new Date(),
            },
          },
          data: {
            status: "CONFIRMADO",
            confirmadoEm: new Date(),
          },
        });

      if (resultado.count === 0) {
        return erro(
          res,
          409,
          "Não foi possível confirmar. A consulta pode ter sido alterada, estar no passado ou não pertencer ao seu perfil."
        );
      }

      const agendamento =
        await prisma.agendamento.findFirst({
          where: {
            id,
            perfilPsicologoId: perfilId,
          },
          select: {
            id: true,
            inicio: true,
            fim: true,
            status: true,
            confirmadoEm: true,
          },
        });

      return res.json({
        success: true,
        modoDemonstracao: true,
        message:
          "Consulta demonstrativa confirmada com sucesso.",
        agendamento,
      });
    } catch (error) {
      console.error(
        "Erro ao confirmar agendamento:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível confirmar o agendamento."
      );
    }
  }
);

// ==========================================
// PATCH /api/agenda/psicologo/agendamentos/:id/cancelar
// ==========================================

router.patch(
  "/psicologo/agendamentos/:id/cancelar",
  async (req: Request, res: Response) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      if (!origemPermitida(req)) {
        return erro(
          res,
          403,
          "Origem não permitida."
        );
      }

      const perfilId = await autenticarPsicologo(
        req,
        res
      );

      if (!perfilId) return;

      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return erro(
          res,
          400,
          "Identificador do agendamento inválido."
        );
      }

      // Permite cancelar somente consultas
      // futuras e ainda ativas.

      const resultado =
        await prisma.agendamento.updateMany({
          where: {
            id,
            perfilPsicologoId: perfilId,
            status: {
              in: ["PENDENTE", "CONFIRMADO"],
            },
            inicio: {
              gt: new Date(),
            },
          },
          data: {
            status: "CANCELADO",
            canceladoEm: new Date(),
          },
        });

      if (resultado.count === 0) {
        return erro(
          res,
          409,
          "Não foi possível cancelar. A consulta pode ter sido alterada, estar no passado ou não pertencer ao seu perfil."
        );
      }

      const agendamento =
        await prisma.agendamento.findFirst({
          where: {
            id,
            perfilPsicologoId: perfilId,
          },
          select: {
            id: true,
            inicio: true,
            fim: true,
            status: true,
            canceladoEm: true,
          },
        });

      return res.json({
        success: true,
        modoDemonstracao: true,
        message:
          "Consulta demonstrativa cancelada com sucesso.",
        agendamento,
      });
    } catch (error) {
      console.error(
        "Erro ao cancelar agendamento:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível cancelar o agendamento."
      );
    }
  }
);
// ==========================================
// PATCH /api/agenda/meus-agendamentos/:id/cancelar
// ==========================================

router.patch(
  "/meus-agendamentos/:id/cancelar",
  async (req: Request, res: Response) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      if (!origemPermitida(req)) {
        return erro(res, 403, "Origem não permitida.");
      }

      const pacienteId = await autenticarPaciente(req, res);

      if (!pacienteId) return;

      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return erro(
          res,
          400,
          "Identificador do agendamento inválido."
        );
      }

      const resultado = await prisma.agendamento.updateMany({
        where: {
          id,
          pacienteId,
          status: {
            in: ["PENDENTE", "CONFIRMADO"],
          },
          inicio: {
            gt: new Date(),
          },
        },
        data: {
          status: "CANCELADO",
          canceladoEm: new Date(),
        },
      });

      if (resultado.count === 0) {
        return erro(
          res,
          409,
          "Não foi possível cancelar. Verifique se a consulta está ativa e no futuro."
        );
      }

      const agendamento = await prisma.agendamento.findFirst({
        where: {
          id,
          pacienteId,
        },
        select: {
          id: true,
          inicio: true,
          fim: true,
          status: true,
          canceladoEm: true,
        },
      });

      return res.json({
        success: true,
        modoDemonstracao: true,
        message: "Consulta demonstrativa cancelada com sucesso.",
        agendamento,
      });
    } catch (error) {
      console.error(
        "Erro ao cancelar consulta pelo paciente:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível cancelar a consulta."
      );
    }
  }
);

// ==========================================
// PATCH /api/agenda/meus-agendamentos/:id/reagendar
// ==========================================

router.patch(
  "/meus-agendamentos/:id/reagendar",
  async (req: Request, res: Response) => {
    try {
      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      if (!origemPermitida(req)) {
        return erro(res, 403, "Origem não permitida.");
      }

      const pacienteId = await autenticarPaciente(req, res);

      if (!pacienteId) return;

      const id = req.params.id;
      const { inicio } = req.body ?? {};

      if (typeof id !== "string" || !id.trim()) {
        return erro(
          res,
          400,
          "Identificador do agendamento inválido."
        );
      }

      if (
        typeof inicio !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(
          inicio
        )
      ) {
        return erro(
          res,
          400,
          "Informe o novo horário no formato ISO UTC."
        );
      }

      const novoInicio = new Date(inicio);

      if (
        Number.isNaN(novoInicio.getTime()) ||
        novoInicio <= new Date()
      ) {
        return erro(
          res,
          400,
          "Selecione uma data e horário futuros."
        );
      }

      const novoFim = new Date(
        novoInicio.getTime() +
          DURACAO_CONSULTA * MINUTO_MS
      );

      const agendamentoAtual =
        await prisma.agendamento.findFirst({
          where: {
            id,
            pacienteId,
            status: {
              in: ["PENDENTE", "CONFIRMADO"],
            },
            inicio: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
            perfilPsicologoId: true,
            inicio: true,
          },
        });

      if (!agendamentoAtual) {
        return erro(
          res,
          409,
          "A consulta não está disponível para reagendamento."
        );
      }

      if (
        agendamentoAtual.inicio.getTime() ===
        novoInicio.getTime()
      ) {
        return erro(
          res,
          400,
          "Selecione um horário diferente do atual."
        );
      }

      const perfilPsicologoId =
        agendamentoAtual.perfilPsicologoId;

      const { diaSemana, inicioMinutos } =
        obterDadosLocais(novoInicio);

      const fimMinutos =
        inicioMinutos + DURACAO_CONSULTA;

      const margem =
        INTERVALO_CONSULTA * MINUTO_MS;

      const resultado = await prisma.$transaction(
        async (tx) => {
          // Serializa operações de agendamento
          // para o mesmo profissional.

          await tx.$queryRaw<{ bloqueio: boolean }[]>`
            SELECT
              pg_advisory_xact_lock(
                hashtext(${perfilPsicologoId})
              ) IS NULL AS bloqueio
          `;

          // Revalida a consulta dentro da transação.

          const consulta = await tx.agendamento.findFirst({
            where: {
              id,
              pacienteId,
              perfilPsicologoId,
              status: {
                in: ["PENDENTE", "CONFIRMADO"],
              },
              inicio: {
                gt: new Date(),
              },
            },
            select: {
              id: true,
              inicio: true,
            },
          });

          if (!consulta) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          if (
            consulta.inicio.getTime() ===
            novoInicio.getTime()
          ) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          const perfil =
            await tx.perfilPsicologo.findFirst({
              where: {
                id: perfilPsicologoId,
                status: "APROVADO",
                usuario: {
                  ativo: true,
                },
              },
              select: {
                id: true,
              },
            });

          if (!perfil) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          const disponibilidades =
            await tx.disponibilidadePsicologo.findMany({
              where: {
                perfilPsicologoId,
                diaSemana,
                ativo: true,
                inicioMinutos: {
                  lte: inicioMinutos,
                },
                fimMinutos: {
                  gte: fimMinutos,
                },
              },
            });

          const horarioPermitido =
            disponibilidades.some((item) => {
              const deslocamento =
                inicioMinutos - item.inicioMinutos;

              return (
                deslocamento >= 0 &&
                deslocamento % PASSO_AGENDA === 0
              );
            });

          if (!horarioPermitido) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          const bloqueio =
            await tx.bloqueioAgenda.findFirst({
              where: {
                perfilPsicologoId,
                inicio: {
                  lt: novoFim,
                },
                fim: {
                  gt: novoInicio,
                },
              },
            });

          if (bloqueio) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          const conflito =
            await tx.agendamento.findFirst({
              where: {
                id: {
                  not: id,
                },
                perfilPsicologoId,
                status: {
                  in: ["PENDENTE", "CONFIRMADO"],
                },
                inicio: {
                  lt: new Date(
                    novoFim.getTime() + margem
                  ),
                },
                fim: {
                  gt: new Date(
                    novoInicio.getTime() - margem
                  ),
                },
              },
            });

          if (conflito) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          // Atualização condicional para impedir
          // alteração de consulta cancelada
          // ou modificada durante a operação.

          const atualizacao =
            await tx.agendamento.updateMany({
              where: {
                id,
                pacienteId,
                perfilPsicologoId,
                status: {
                  in: ["PENDENTE", "CONFIRMADO"],
                },
                inicio: consulta.inicio,
              },
              data: {
                inicio: novoInicio,
                fim: novoFim,
                status: "PENDENTE",
                confirmadoEm: null,
                canceladoEm: null,
                concluidoEm: null,
              },
            });

          if (atualizacao.count === 0) {
            return {
              conflito: true as const,
              agendamento: null,
            };
          }

          const agendamento =
            await tx.agendamento.findFirst({
              where: {
                id,
                pacienteId,
              },
              select: {
                id: true,
                inicio: true,
                fim: true,
                status: true,
                perfilPsicologoId: true,
              },
            });

          return {
            conflito: false as const,
            agendamento,
          };
        },
        {
          maxWait: 10000,
          timeout: 15000,
        }
      );

      if (
        resultado.conflito ||
        !resultado.agendamento
      ) {
        return erro(
          res,
          409,
          "Não foi possível reagendar. O horário pode estar indisponível ou a consulta foi alterada."
        );
      }

      return res.json({
        success: true,
        modoDemonstracao: true,
        message:
          "Consulta demonstrativa reagendada com sucesso. Aguardando nova confirmação do profissional.",
        agendamento: resultado.agendamento,
      });
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        (
          error.code === "P2002" ||
          (
            error.code === "P2010" &&
            error.meta?.code === "23P01"
          )
        )
      ) {
        return erro(
          res,
          409,
          "Horário indisponível. Escolha outro."
        );
      }

      console.error(
        "Erro ao reagendar consulta:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível reagendar a consulta."
      );
    }
  }
);
// ==========================================
// PATCH /api/agenda/psicologo/agendamentos/:id/concluir
// ==========================================

router.patch(
  "/psicologo/agendamentos/:id/concluir",
  async (req: Request, res: Response) => {
    try {
      // ======================================
      // VERIFICAR MODO DEMONSTRATIVO
      // ======================================

      if (!modoDemonstracaoAtivo()) {
        return erro(
          res,
          403,
          "Recurso disponível somente no modo demo."
        );
      }

      // ======================================
      // VERIFICAR ORIGEM
      // ======================================

      if (!origemPermitida(req)) {
        return erro(
          res,
          403,
          "Origem não permitida."
        );
      }

      // ======================================
      // AUTENTICAR PSICÓLOGO
      // ======================================

      const perfilId = await autenticarPsicologo(
        req,
        res
      );

      if (!perfilId) return;

      // ======================================
      // VALIDAR IDENTIFICADOR
      // ======================================

      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return erro(
          res,
          400,
          "Identificador do agendamento inválido."
        );
      }

      // ======================================
      // CONCLUIR CONSULTA
      // ======================================

      const agora = new Date();

      // A atualização somente será permitida
      // quando:
      //
      // 1. A consulta pertencer ao psicólogo.
      // 2. O status estiver CONFIRMADO.
      // 3. O horário de término já tiver passado.
      //
      // updateMany permite aplicar todas as
      // condições diretamente na atualização.

      const resultado =
        await prisma.agendamento.updateMany({
          where: {
            id,
            perfilPsicologoId: perfilId,
            status: "CONFIRMADO",
            fim: {
              lte: agora,
            },
          },
          data: {
            status: "CONCLUIDO",
            concluidoEm: agora,
          },
        });

      // ======================================
      // VERIFICAR RESULTADO
      // ======================================

      if (resultado.count === 0) {
        return erro(
          res,
          409,
          "Não foi possível concluir a consulta. Verifique se ela está confirmada, se o horário já terminou e se pertence ao seu perfil."
        );
      }

      // ======================================
      // CONSULTAR AGENDAMENTO ATUALIZADO
      // ======================================

      const agendamento =
        await prisma.agendamento.findFirst({
          where: {
            id,
            perfilPsicologoId: perfilId,
          },
          select: {
            id: true,
            inicio: true,
            fim: true,
            status: true,
            confirmadoEm: true,
            concluidoEm: true,
          },
        });

      // ======================================
      // RETORNAR RESULTADO
      // ======================================

      return res.json({
        success: true,
        modoDemonstracao: true,
        message:
          "Consulta demonstrativa concluída com sucesso.",
        agendamento,
      });
    } catch (error) {
      console.error(
        "Erro ao concluir consulta demonstrativa:",
        error
      );

      return erro(
        res,
        500,
        "Não foi possível concluir a consulta demonstrativa."
      );
    }
  }
);
// ==========================================
// EXPORTAR ROTAS
// ==========================================

export default router;