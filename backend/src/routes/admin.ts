import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma";

const router = Router();

// ==========================================
// CONFIGURAÇÃO DA AUTENTICAÇÃO
// ==========================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  throw new Error("JWT_SECRET não configurado corretamente.");
}

const chaveJwt: string = JWT_SECRET;

const COOKIE_NAME = "mente_conecta_token";

// ==========================================
// CONFIGURAÇÃO DO MODO DEMONSTRAÇÃO
// ==========================================

type AppMode = "demo" | "production";

const APP_MODE = process.env.APP_MODE;

if (APP_MODE !== "demo" && APP_MODE !== "production") {
  throw new Error(
    "APP_MODE deve ser configurado como demo ou production."
  );
}

const modoAplicacao: AppMode = APP_MODE;

const MODO_DEMONSTRACAO = modoAplicacao === "demo";

// ==========================================
// TIPOS
// ==========================================

type AdministradorAutenticado = {
  id: string;
  nome: string;
  email: string;
  tipo: "ADMIN";
};

type DecisaoPsicologo = "APROVADO" | "REJEITADO";

type AcaoStatus = "SUSPENDER" | "REATIVAR";

type DadosVerificacaoCrp = {
  confirmado?: unknown;
  fonte?: unknown;
  dataConsulta?: unknown;
  resultado?: unknown;
};

type DadosDecisao = {
  decisao?: unknown;
  justificativa?: unknown;
  verificacaoCrp?: DadosVerificacaoCrp;
};

type DadosAlteracaoStatus = {
  acao?: unknown;
  justificativa?: unknown;
  verificacaoCrp?: DadosVerificacaoCrp;
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function validarOrigem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const origem = req.get("origin");

  const origemPermitida =
    process.env.FRONTEND_URL?.replace(/\/$/, "");

  if (!origemPermitida || origem !== origemPermitida) {
    res.status(403).json({
      success: false,
      message: "Origem da requisição não autorizada.",
    });

    return;
  }

  next();
}

function validarJustificativa(
  justificativa: unknown
): justificativa is string {
  return (
    typeof justificativa === "string" &&
    justificativa.trim().length >= 10 &&
    justificativa.trim().length <= 2000
  );
}

function validarVerificacaoCrp(
  verificacaoCrp: unknown
):
  | { valido: true; registro: string }
  | { valido: false; mensagem: string } {
  if (
    !verificacaoCrp ||
    typeof verificacaoCrp !== "object" ||
    Array.isArray(verificacaoCrp)
  ) {
    return {
      valido: false,
      mensagem:
        "A operação exige os dados da verificação oficial do CRP.",
    };
  }

  const dados = verificacaoCrp as DadosVerificacaoCrp;

  const { confirmado, fonte, dataConsulta, resultado } =
    dados;

  if (confirmado !== true) {
    return {
      valido: false,
      mensagem:
        "É necessário confirmar a conferência oficial do CRP.",
    };
  }

  if (
    typeof fonte !== "string" ||
    fonte.trim().length < 10 ||
    fonte.trim().length > 500
  ) {
    return {
      valido: false,
      mensagem:
        "Informe a fonte oficial utilizada na consulta do CRP.",
    };
  }

  if (
    typeof resultado !== "string" ||
    resultado.trim().length < 10 ||
    resultado.trim().length > 1000
  ) {
    return {
      valido: false,
      mensagem:
        "Descreva o resultado da verificação do CRP.",
    };
  }

  if (typeof dataConsulta !== "string") {
    return {
      valido: false,
      mensagem: "Informe a data da consulta do CRP.",
    };
  }

  let dataVerificacao: Date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataConsulta)) {
    dataVerificacao = new Date(
      `${dataConsulta}T12:00:00.000Z`
    );

    if (
      Number.isNaN(dataVerificacao.getTime()) ||
      dataVerificacao.toISOString().slice(0, 10) !==
        dataConsulta
    ) {
      return {
        valido: false,
        mensagem: "A data da consulta do CRP é inválida.",
      };
    }
  } else {
    dataVerificacao = new Date(dataConsulta);

    if (Number.isNaN(dataVerificacao.getTime())) {
      return {
        valido: false,
        mensagem: "A data da consulta do CRP é inválida.",
      };
    }
  }

  const agora = Date.now();

  const inicioDiaAtual = new Date();
  inicioDiaAtual.setHours(0, 0, 0, 0);

  const dataLimite = new Date(inicioDiaAtual);
  dataLimite.setDate(dataLimite.getDate() - 30);

  if (
    dataVerificacao.getTime() > agora ||
    dataVerificacao.getTime() < dataLimite.getTime()
  ) {
    return {
      valido: false,
      mensagem:
        "A consulta do CRP deve ter ocorrido nos últimos 30 dias.",
    };
  }

  return {
    valido: true,
    registro: [
      "VERIFICAÇÃO OFICIAL DO CRP",
      `Fonte: ${fonte.trim()}`,
      `Data: ${dataVerificacao.toISOString()}`,
      `Resultado: ${resultado.trim()}`,
      "Conferência declarada pelo administrador.",
    ].join("\n"),
  };
}

function montarAuditoria(
  operacao: string,
  justificativa: string,
  registroVerificacao = "",
  exigeVerificacaoCrp = false
) {
  return [
    MODO_DEMONSTRACAO
      ? "MODO DEMONSTRAÇÃO — OPERAÇÃO SIMULADA"
      : "OPERAÇÃO ADMINISTRATIVA",

    operacao,

    `JUSTIFICATIVA: ${justificativa}`,

    MODO_DEMONSTRACAO && exigeVerificacaoCrp
      ? "CRP NÃO VERIFICADO — OPERAÇÃO FICTÍCIA PARA PORTFÓLIO"
      : registroVerificacao,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMINISTRATIVA
// ==========================================

async function exigirAdministrador(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token || typeof token !== "string") {
      res.status(401).json({
        success: false,
        message: "É necessário realizar login.",
      });

      return;
    }

    let payload: jwt.JwtPayload | string;

    try {
      payload = jwt.verify(token, chaveJwt, {
        algorithms: ["HS256"],
      });
    } catch {
      res.status(401).json({
        success: false,
        message: "Sessão inválida ou expirada.",
      });

      return;
    }

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string"
    ) {
      res.status(401).json({
        success: false,
        message: "Sessão inválida.",
      });

      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: payload.sub,
      },

      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      res.status(401).json({
        success: false,
        message: "Usuário não autenticado ou inativo.",
      });

      return;
    }

    if (usuario.tipo !== "ADMIN") {
      res.status(403).json({
        success: false,
        message:
          "Acesso permitido somente a administradores.",
      });

      return;
    }

    const administrador: AdministradorAutenticado = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: "ADMIN",
    };

    res.locals.administrador = administrador;

    next();
  } catch (error) {
    console.error(
      "Erro na autenticação administrativa:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Não foi possível verificar o acesso administrativo.",
    });
  }
}

// ==========================================
// PROTEÇÃO DE TODAS AS ROTAS
// ==========================================

router.use(exigirAdministrador);

// ==========================================
// VERIFICAR SESSÃO ADMINISTRATIVA
// GET /api/admin/me
// ==========================================

router.get("/me", (_req: Request, res: Response) => {
  const administrador =
    res.locals.administrador as AdministradorAutenticado;

  return res.status(200).json({
    success: true,
    usuario: administrador,
    appMode: modoAplicacao,
    modoDemonstracao: MODO_DEMONSTRACAO,
  });
});

// ==========================================
// LISTAR PSICÓLOGOS PENDENTES
// GET /api/admin/psicologos/pendentes
// ==========================================

router.get(
  "/psicologos/pendentes",
  async (_req: Request, res: Response) => {
    try {
      const perfis = await prisma.perfilPsicologo.findMany({
        where: {
          status: "PENDENTE",
        },

        select: {
          id: true,
          crpNumero: true,
          crpUf: true,
          telefone: true,
          especialidade: true,
          biografia: true,
          valorConsulta: true,
          status: true,
          criadoEm: true,
          atualizadoEm: true,

          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              ativo: true,
            },
          },

          endereco: {
            select: {
              cep: true,
              logradouro: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              uf: true,
            },
          },
        },

        orderBy: {
          criadoEm: "asc",
        },
      });

      const psicologos = perfis.map((perfil) => ({
        id: perfil.id,
        usuario: perfil.usuario,
        crpNumero: perfil.crpNumero,
        crpUf: perfil.crpUf,
        telefone: perfil.telefone,
        especialidade: perfil.especialidade,
        biografia: perfil.biografia,
        valorConsulta: perfil.valorConsulta.toString(),
        status: perfil.status,
        criadoEm: perfil.criadoEm,
        atualizadoEm: perfil.atualizadoEm,
        endereco: perfil.endereco,
      }));

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,
        total: psicologos.length,
        psicologos,
      });
    } catch (error) {
      console.error(
        "Erro ao listar psicólogos pendentes:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível carregar os psicólogos pendentes.",
      });
    }
  }
);

// ==========================================
// CONSULTAR PSICÓLOGO INDIVIDUALMENTE
// GET /api/admin/psicologos/:id
// ==========================================

router.get(
  "/psicologos/:id",
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Identificador do psicólogo inválido.",
        });
      }

      const perfil = await prisma.perfilPsicologo.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          crpNumero: true,
          crpUf: true,
          telefone: true,
          especialidade: true,
          biografia: true,
          valorConsulta: true,
          status: true,
          criadoEm: true,
          atualizadoEm: true,
          aprovadoEm: true,

          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              ativo: true,
            },
          },

          endereco: {
            select: {
              cep: true,
              logradouro: true,
              numero: true,
              complemento: true,
              bairro: true,
              cidade: true,
              uf: true,
            },
          },
        },
      });

      if (!perfil) {
        return res.status(404).json({
          success: false,
          message: "Psicólogo não encontrado.",
        });
      }

      const psicologo = {
        id: perfil.id,
        usuario: perfil.usuario,
        crpNumero: perfil.crpNumero,
        crpUf: perfil.crpUf,
        telefone: perfil.telefone,
        especialidade: perfil.especialidade,
        biografia: perfil.biografia,
        valorConsulta: perfil.valorConsulta.toString(),
        status: perfil.status,
        criadoEm: perfil.criadoEm,
        atualizadoEm: perfil.atualizadoEm,
        aprovadoEm: perfil.aprovadoEm,
        endereco: perfil.endereco,
      };

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,
        psicologo,
      });
    } catch (error) {
      console.error(
        "Erro ao consultar psicólogo:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Não foi possível consultar o psicólogo.",
      });
    }
  }
);

// ==========================================
// APROVAR OU REJEITAR PSICÓLOGO
// PATCH /api/admin/psicologos/:id/decisao
// ==========================================

router.patch(
  "/psicologos/:id/decisao",
  validarOrigem,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Identificador do psicólogo inválido.",
        });
      }

      const administrador =
        res.locals.administrador as AdministradorAutenticado;

      const corpo = req.body as DadosDecisao | null;

      if (
        !corpo ||
        typeof corpo !== "object" ||
        Array.isArray(corpo)
      ) {
        return res.status(400).json({
          success: false,
          message: "Dados da decisão inválidos.",
        });
      }

      const { decisao, justificativa, verificacaoCrp } =
        corpo;

      // ======================================
      // VALIDAR DECISÃO
      // ======================================

      if (
        decisao !== "APROVADO" &&
        decisao !== "REJEITADO"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A decisão deve ser APROVADO ou REJEITADO.",
        });
      }

      const statusNovo: DecisaoPsicologo = decisao;

      // ======================================
      // VALIDAR JUSTIFICATIVA
      // ======================================

      if (!validarJustificativa(justificativa)) {
        return res.status(400).json({
          success: false,
          message:
            "A justificativa deve conter entre 10 e 2000 caracteres.",
        });
      }

      const justificativaLimpa = justificativa.trim();

      // ======================================
      // VERIFICAÇÃO DO CRP
      // ======================================

      let registroVerificacao = "";

      if (
        statusNovo === "APROVADO" &&
        !MODO_DEMONSTRACAO
      ) {
        const verificacao = validarVerificacaoCrp(
          verificacaoCrp
        );

        if (!verificacao.valido) {
          return res.status(400).json({
            success: false,
            message: verificacao.mensagem,
          });
        }

        registroVerificacao = verificacao.registro;
      }

      // ======================================
      // PREPARAR AUDITORIA
      // ======================================

      const justificativaAuditoria = montarAuditoria(
        `DECISÃO: ${statusNovo}`,
        justificativaLimpa,
        registroVerificacao,
        statusNovo === "APROVADO"
      );

      // ======================================
      // TRANSAÇÃO ATÔMICA
      // ======================================

      const resultadoTransacao = await prisma.$transaction(
        async (tx) => {
          const atualizacao =
            await tx.perfilPsicologo.updateMany({
              where: {
                id,
                status: "PENDENTE",

                usuario: {
                  is: {
                    ativo: true,
                  },
                },
              },

              data: {
                status: statusNovo,

                aprovadoEm:
                  statusNovo === "APROVADO"
                    ? new Date()
                    : null,
              },
            });

          if (atualizacao.count === 0) {
            return {
              atualizado: false as const,
            };
          }

          const auditoria =
            await tx.auditoriaPsicologo.create({
              data: {
                perfilPsicologoId: id,
                administradorId: administrador.id,
                statusAnterior: "PENDENTE",
                statusNovo,
                justificativa: justificativaAuditoria,
              },

              select: {
                id: true,
                criadoEm: true,
                statusAnterior: true,
                statusNovo: true,
              },
            });

          return {
            atualizado: true as const,
            auditoria,
          };
        }
      );

      // ======================================
      // VERIFICAR RESULTADO
      // ======================================

      if (!resultadoTransacao.atualizado) {
        const perfilAtual =
          await prisma.perfilPsicologo.findUnique({
            where: {
              id,
            },

            select: {
              id: true,
              status: true,

              usuario: {
                select: {
                  ativo: true,
                },
              },
            },
          });

        if (!perfilAtual) {
          return res.status(404).json({
            success: false,
            message: "Psicólogo não encontrado.",
          });
        }

        if (!perfilAtual.usuario.ativo) {
          return res.status(409).json({
            success: false,
            message:
              "Não é possível decidir sobre um psicólogo com a conta de usuário inativa.",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "Este cadastro não está mais pendente e não pode receber uma nova decisão.",
          statusAtual: perfilAtual.status,
        });
      }

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,

        message:
          statusNovo === "APROVADO"
            ? MODO_DEMONSTRACAO
              ? "Psicólogo aprovado na demonstração."
              : "Psicólogo aprovado com sucesso."
            : MODO_DEMONSTRACAO
              ? "Cadastro rejeitado na demonstração."
              : "Cadastro do psicólogo rejeitado.",

        psicologo: {
          id,
          status: statusNovo,
        },

        auditoria: resultadoTransacao.auditoria,
      });
    } catch (error) {
      console.error(
        "Erro ao registrar decisão administrativa:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível registrar a decisão administrativa.",
      });
    }
  }
);

// ==========================================
// HISTÓRICO DE AUDITORIA ADMINISTRATIVA
// GET /api/admin/auditoria
// ==========================================

router.get(
  "/auditoria",
  async (req: Request, res: Response) => {
    try {
      const paginaTexto = req.query.pagina;
      const limiteTexto = req.query.limite;

      const pagina =
        typeof paginaTexto === "string"
          ? Number(paginaTexto)
          : 1;

      const limite =
        typeof limiteTexto === "string"
          ? Number(limiteTexto)
          : 10;

      if (
        !Number.isSafeInteger(pagina) ||
        pagina < 1 ||
        !Number.isSafeInteger(limite) ||
        limite < 1 ||
        limite > 50
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Parâmetros de paginação inválidos. A página deve ser maior que zero e o limite deve estar entre 1 e 50.",
        });
      }

      const skip = (pagina - 1) * limite;

      if (!Number.isSafeInteger(skip)) {
        return res.status(400).json({
          success: false,
          message: "Número de página muito elevado.",
        });
      }

      const [total, registros] = await prisma.$transaction([
        prisma.auditoriaPsicologo.count(),

        prisma.auditoriaPsicologo.findMany({
          skip,
          take: limite,

          orderBy: [
            {
              criadoEm: "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            criadoEm: true,
            statusAnterior: true,
            statusNovo: true,
            justificativa: true,

            perfilPsicologo: {
              select: {
                id: true,
                crpNumero: true,
                crpUf: true,

                usuario: {
                  select: {
                    id: true,
                    nome: true,
                    email: true,
                  },
                },
              },
            },

            administrador: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        }),
      ]);

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,

        paginacao: {
          pagina,
          limite,
          total,
          totalPaginas: Math.ceil(total / limite),
        },

        auditorias: registros.map((registro) => ({
          id: registro.id,
          criadoEm: registro.criadoEm,
          statusAnterior: registro.statusAnterior,
          statusNovo: registro.statusNovo,
          justificativa: registro.justificativa,

          psicologo: {
            id: registro.perfilPsicologo.id,
            nome: registro.perfilPsicologo.usuario.nome,
            email: registro.perfilPsicologo.usuario.email,
            crpNumero: registro.perfilPsicologo.crpNumero,
            crpUf: registro.perfilPsicologo.crpUf,
          },

          administrador: {
            id: registro.administrador.id,
            nome: registro.administrador.nome,
            email: registro.administrador.email,
          },
        })),
      });
    } catch (error) {
      console.error(
        "Erro ao consultar histórico de auditoria:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível carregar o histórico de auditoria.",
      });
    }
  }
);

// ==========================================
// GESTÃO GERAL DE PSICÓLOGOS
// GET /api/admin/psicologos
// ==========================================

router.get(
  "/psicologos",
  async (req: Request, res: Response) => {
    try {
      const paginaTexto = req.query.pagina;
      const limiteTexto = req.query.limite;
      const statusTexto = req.query.status;
      const buscaTexto = req.query.busca;

      const pagina =
        typeof paginaTexto === "string"
          ? Number(paginaTexto)
          : 1;

      const limite =
        typeof limiteTexto === "string"
          ? Number(limiteTexto)
          : 10;

      if (
        !Number.isSafeInteger(pagina) ||
        pagina < 1 ||
        !Number.isSafeInteger(limite) ||
        limite < 1 ||
        limite > 50
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Paginação inválida. Informe uma página válida e um limite entre 1 e 50.",
        });
      }

      const skip = (pagina - 1) * limite;

      if (!Number.isSafeInteger(skip)) {
        return res.status(400).json({
          success: false,
          message: "Número de página muito elevado.",
        });
      }

      // ======================================
      // VALIDAR STATUS
      // ======================================

      const statusPermitidos = [
        "RASCUNHO",
        "PENDENTE",
        "APROVADO",
        "REJEITADO",
        "SUSPENSO",
      ] as const;

      type StatusPermitido =
        (typeof statusPermitidos)[number];

      let status: StatusPermitido | undefined;

      if (statusTexto !== undefined) {
        if (
          typeof statusTexto !== "string" ||
          !statusPermitidos.some(
            (valor) => valor === statusTexto
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Status de psicólogo inválido.",
          });
        }

        status = statusTexto as StatusPermitido;
      }

      // ======================================
      // VALIDAR PESQUISA
      // ======================================

      if (
        buscaTexto !== undefined &&
        typeof buscaTexto !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Parâmetro de pesquisa inválido.",
        });
      }

      const busca =
        typeof buscaTexto === "string"
          ? buscaTexto.trim()
          : "";

      if (busca.length > 100) {
        return res.status(400).json({
          success: false,
          message:
            "A pesquisa deve conter no máximo 100 caracteres.",
        });
      }

      // ======================================
      // CONSTRUIR FILTROS
      // ======================================

      const filtros = {
        ...(status ? { status } : {}),

        ...(busca
          ? {
              OR: [
                {
                  usuario: {
                    nome: {
                      contains: busca,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  usuario: {
                    email: {
                      contains: busca,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  crpNumero: {
                    contains: busca,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      };

      // ======================================
      // CONSULTAR BANCO DE DADOS
      // ======================================

      const [total, psicologos] =
        await prisma.$transaction([
          prisma.perfilPsicologo.count({
            where: filtros,
          }),

          prisma.perfilPsicologo.findMany({
            where: filtros,

            skip,
            take: limite,

            orderBy: [
              {
                criadoEm: "desc",
              },
              {
                id: "desc",
              },
            ],

            select: {
              id: true,
              crpNumero: true,
              crpUf: true,
              especialidade: true,
              valorConsulta: true,
              status: true,
              criadoEm: true,
              aprovadoEm: true,

              usuario: {
                select: {
                  id: true,
                  nome: true,
                  email: true,
                  ativo: true,
                },
              },
            },
          }),
        ]);

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,

        paginacao: {
          pagina,
          limite,
          total,
          totalPaginas: Math.ceil(total / limite),
        },

        filtros: {
          status: status || null,
          busca,
        },

        psicologos: psicologos.map((psicologo) => ({
          id: psicologo.id,
          nome: psicologo.usuario.nome,
          email: psicologo.usuario.email,
          usuarioAtivo: psicologo.usuario.ativo,
          crpNumero: psicologo.crpNumero,
          crpUf: psicologo.crpUf,
          especialidade: psicologo.especialidade,
          valorConsulta: psicologo.valorConsulta.toString(),
          status: psicologo.status,
          criadoEm: psicologo.criadoEm,
          aprovadoEm: psicologo.aprovadoEm,
        })),
      });
    } catch (error) {
      console.error(
        "Erro ao listar psicólogos:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível consultar os psicólogos cadastrados.",
      });
    }
  }
);

// ==========================================
// SUSPENDER OU REATIVAR PSICÓLOGO
// PATCH /api/admin/psicologos/:id/status
// ==========================================

router.patch(
  "/psicologos/:id/status",
  validarOrigem,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Identificador do psicólogo inválido.",
        });
      }

      const administrador =
        res.locals.administrador as AdministradorAutenticado;

      const corpo = req.body as DadosAlteracaoStatus | null;

      if (
        !corpo ||
        typeof corpo !== "object" ||
        Array.isArray(corpo)
      ) {
        return res.status(400).json({
          success: false,
          message: "Dados da solicitação inválidos.",
        });
      }

      const { acao, justificativa, verificacaoCrp } =
        corpo;

      // ======================================
      // VALIDAR AÇÃO
      // ======================================

      if (
        acao !== "SUSPENDER" &&
        acao !== "REATIVAR"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A ação deve ser SUSPENDER ou REATIVAR.",
        });
      }

      const acaoValidada: AcaoStatus = acao;

      // ======================================
      // VALIDAR JUSTIFICATIVA
      // ======================================

      if (!validarJustificativa(justificativa)) {
        return res.status(400).json({
          success: false,
          message:
            "A justificativa deve conter entre 10 e 2000 caracteres.",
        });
      }

      const justificativaLimpa = justificativa.trim();

      // ======================================
      // DEFINIR TRANSIÇÃO
      // ======================================

      const statusAnterior =
        acaoValidada === "SUSPENDER"
          ? "APROVADO"
          : "SUSPENSO";

      const statusNovo =
        acaoValidada === "SUSPENDER"
          ? "SUSPENSO"
          : "APROVADO";

      // ======================================
      // VERIFICAR CRP PARA REATIVAÇÃO
      // ======================================

      let registroVerificacao = "";

      if (
        acaoValidada === "REATIVAR" &&
        !MODO_DEMONSTRACAO
      ) {
        const verificacao = validarVerificacaoCrp(
          verificacaoCrp
        );

        if (!verificacao.valido) {
          return res.status(400).json({
            success: false,
            message: verificacao.mensagem,
          });
        }

        registroVerificacao = verificacao.registro;
      }

      // ======================================
      // PREPARAR AUDITORIA
      // ======================================

      const justificativaAuditoria = montarAuditoria(
        `AÇÃO: ${acaoValidada}`,
        justificativaLimpa,
        registroVerificacao,
        acaoValidada === "REATIVAR"
      );

      // ======================================
      // TRANSAÇÃO ATÔMICA
      // ======================================

      const resultadoTransacao = await prisma.$transaction(
        async (tx) => {
          const atualizacao =
            await tx.perfilPsicologo.updateMany({
              where: {
                id,
                status: statusAnterior,

                ...(acaoValidada === "REATIVAR"
                  ? {
                      usuario: {
                        is: {
                          ativo: true,
                        },
                      },
                    }
                  : {}),
              },

              data: {
                status: statusNovo,
              },
            });

          if (atualizacao.count === 0) {
            return {
              atualizado: false as const,
            };
          }

          const auditoria =
            await tx.auditoriaPsicologo.create({
              data: {
                perfilPsicologoId: id,
                administradorId: administrador.id,
                statusAnterior,
                statusNovo,
                justificativa: justificativaAuditoria,
              },

              select: {
                id: true,
                criadoEm: true,
                statusAnterior: true,
                statusNovo: true,
              },
            });

          return {
            atualizado: true as const,
            auditoria,
          };
        }
      );

      // ======================================
      // TRATAR TRANSIÇÃO NÃO PERMITIDA
      // ======================================

      if (!resultadoTransacao.atualizado) {
        const perfilAtual =
          await prisma.perfilPsicologo.findUnique({
            where: {
              id,
            },

            select: {
              status: true,

              usuario: {
                select: {
                  ativo: true,
                },
              },
            },
          });

        if (!perfilAtual) {
          return res.status(404).json({
            success: false,
            message: "Psicólogo não encontrado.",
          });
        }

        if (
          acaoValidada === "REATIVAR" &&
          !perfilAtual.usuario.ativo
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Não é possível reativar um psicólogo com a conta de usuário inativa.",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "O status atual do psicólogo não permite esta operação.",
          statusAtual: perfilAtual.status,
        });
      }

      return res.status(200).json({
        success: true,
        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,

        message:
          acaoValidada === "SUSPENDER"
            ? MODO_DEMONSTRACAO
              ? "Psicólogo suspenso na demonstração."
              : "Psicólogo suspenso com sucesso."
            : MODO_DEMONSTRACAO
              ? "Psicólogo reativado na demonstração."
              : "Psicólogo reativado com sucesso.",

        psicologo: {
          id,
          status: statusNovo,
        },

        auditoria: resultadoTransacao.auditoria,
      });
    } catch (error) {
      console.error(
        "Erro ao alterar status do psicólogo:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível alterar o status do psicólogo.",
      });
    }
  }
);
// ==========================================
// REABRIR ANÁLISE DE PSICÓLOGO REJEITADO
// PATCH /api/admin/psicologos/:id/reabrir
// ==========================================

router.patch(
  "/psicologos/:id/reabrir",
  validarOrigem,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      // ======================================
      // VALIDAR IDENTIFICADOR
      // ======================================

      if (typeof id !== "string" || !id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Identificador do psicólogo inválido.",
        });
      }

      // ======================================
      // IDENTIFICAR ADMINISTRADOR
      // ======================================

      const administrador =
        res.locals.administrador as AdministradorAutenticado;

      // ======================================
      // VALIDAR CORPO DA REQUISIÇÃO
      // ======================================

      const corpo = req.body as {
        justificativa?: unknown;
      } | null;

      if (
        !corpo ||
        typeof corpo !== "object" ||
        Array.isArray(corpo)
      ) {
        return res.status(400).json({
          success: false,
          message: "Dados da solicitação inválidos.",
        });
      }

      const { justificativa } = corpo;

      // ======================================
      // VALIDAR JUSTIFICATIVA
      // ======================================

      if (!validarJustificativa(justificativa)) {
        return res.status(400).json({
          success: false,
          message:
            "A justificativa deve conter entre 10 e 2000 caracteres.",
        });
      }

      const justificativaLimpa = justificativa.trim();

      // ======================================
      // PREPARAR REGISTRO DE AUDITORIA
      // ======================================

      const justificativaAuditoria = montarAuditoria(
        "AÇÃO: REABRIR ANÁLISE DE CADASTRO REJEITADO",
        justificativaLimpa
      );

      // ======================================
      // TRANSAÇÃO ATÔMICA
      // ======================================

      const resultadoTransacao = await prisma.$transaction(
        async (tx) => {
          // Somente cadastros rejeitados
          // de usuários ativos podem ser reabertos.

          const atualizacao =
            await tx.perfilPsicologo.updateMany({
              where: {
                id,
                status: "REJEITADO",

                usuario: {
                  is: {
                    ativo: true,
                  },
                },
              },

              data: {
                status: "PENDENTE",

                // A reabertura não representa
                // aprovação profissional.
                aprovadoEm: null,
              },
            });

          if (atualizacao.count === 0) {
            return {
              atualizado: false as const,
            };
          }

          // Registrar a reabertura
          // no histórico administrativo.

          const auditoria =
            await tx.auditoriaPsicologo.create({
              data: {
                perfilPsicologoId: id,
                administradorId: administrador.id,

                statusAnterior: "REJEITADO",
                statusNovo: "PENDENTE",

                justificativa: justificativaAuditoria,
              },

              select: {
                id: true,
                criadoEm: true,
                statusAnterior: true,
                statusNovo: true,
              },
            });

          return {
            atualizado: true as const,
            auditoria,
          };
        }
      );

      // ======================================
      // TRATAR TRANSIÇÃO NÃO PERMITIDA
      // ======================================

      if (!resultadoTransacao.atualizado) {
        const perfilAtual =
          await prisma.perfilPsicologo.findUnique({
            where: {
              id,
            },

            select: {
              status: true,

              usuario: {
                select: {
                  ativo: true,
                },
              },
            },
          });

        if (!perfilAtual) {
          return res.status(404).json({
            success: false,
            message: "Psicólogo não encontrado.",
          });
        }

        if (!perfilAtual.usuario.ativo) {
          return res.status(409).json({
            success: false,
            message:
              "Não é possível reabrir a análise de um psicólogo com a conta de usuário inativa.",
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "Somente cadastros rejeitados podem ter a análise reaberta.",

          statusAtual: perfilAtual.status,
        });
      }

      // ======================================
      // OPERAÇÃO CONCLUÍDA
      // ======================================

      return res.status(200).json({
        success: true,

        appMode: modoAplicacao,
        modoDemonstracao: MODO_DEMONSTRACAO,

        message: MODO_DEMONSTRACAO
          ? "Análise reaberta na demonstração. O cadastro voltou para pendente."
          : "Análise reaberta com sucesso. O cadastro voltou para pendente.",

        psicologo: {
          id,
          status: "PENDENTE",
        },

        auditoria: resultadoTransacao.auditoria,
      });
    } catch (error) {
      console.error(
        "Erro ao reabrir análise do psicólogo:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Não foi possível reabrir a análise do psicólogo.",
      });
    }
  }
);
export default router;