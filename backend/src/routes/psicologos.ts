import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

const COOKIE_NAME = "mente_conecta_token";

// ==========================================
// CONFIGURAÇÃO DO AMBIENTE
// ==========================================

const APP_MODE = process.env.APP_MODE;

const modoValido =
  APP_MODE === "demo" || APP_MODE === "production";

const modoDemonstracao = APP_MODE === "demo";

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function somenteNumeros(valor: string): string {
  return valor.replace(/\D/g, "");
}

function emailValido(email: string): boolean {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function ufValida(uf: string): boolean {
  return /^[A-Z]{2}$/.test(uf);
}

function valorMonetario(valor: unknown): Prisma.Decimal | null {
  if (
    typeof valor !== "number" &&
    typeof valor !== "string"
  ) {
    return null;
  }

  if (
    typeof valor === "string" &&
    !/^\d+(\.\d{1,2})?$/.test(valor.trim())
  ) {
    return null;
  }

  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero <= 0 ||
    numero > 99999999.99
  ) {
    return null;
  }

  const centavos = Math.round(numero * 100);

  if (Math.abs(numero * 100 - centavos) > 0.000001) {
    return null;
  }

  return new Prisma.Decimal((centavos / 100).toFixed(2));
}

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

// ==========================================
// VALIDAR AUTENTICAÇÃO DO PSICÓLOGO
// ==========================================

async function autenticarPsicologo(
  req: Request,
  res: Response
): Promise<string | null> {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== "string" || !token) {
    erro(res, 401, "Você precisa estar autenticado.");
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("JWT_SECRET não configurado.");
    erro(res, 500, "Erro de configuração do servidor.");
    return null;
  }

  let usuarioId: string;

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

    usuarioId = decoded.sub;
  } catch {
    erro(res, 401, "Sessão inválida ou expirada.");
    return null;
  }

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

  if (!usuario || !usuario.ativo) {
    erro(res, 403, "Usuário inexistente ou inativo.");
    return null;
  }

  if (usuario.tipo !== "PSICOLOGO") {
    erro(res, 403, "Acesso permitido somente a psicólogos.");
    return null;
  }

  return usuario.id;
}

// ==========================================
// VALIDAR ORIGEM DAS ALTERAÇÕES
// ==========================================

function origemPermitida(req: Request): boolean {
  const origem = req.headers.origin;

  if (typeof origem !== "string") {
    return false;
  }

  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
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
// CADASTRO DEMONSTRATIVO DE PSICÓLOGOS
// POST /api/psicologos/cadastro
// ==========================================

router.post("/cadastro", async (req, res) => {
  try {
    if (!modoDemonstracao) {
      return erro(
        res,
        403,
        "O cadastro demonstrativo está disponível somente no modo demo."
      );
    }

    if (!origemPermitida(req)) {
      return erro(res, 403, "Origem da solicitação não permitida.");
    }

    const {
      nome,
      email,
      telefone,
      senha,
      crpNumero,
      crpUf,
      especialidade,
      biografia,
      valorConsulta,
      endereco,
    } = req.body ?? {};

    // ======================================
    // VALIDAR TIPOS
    // ======================================

    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof telefone !== "string" ||
      typeof senha !== "string" ||
      typeof crpNumero !== "string" ||
      typeof crpUf !== "string" ||
      typeof especialidade !== "string" ||
      typeof biografia !== "string" ||
      !endereco ||
      typeof endereco !== "object" ||
      Array.isArray(endereco)
    ) {
      return erro(
        res,
        400,
        "Preencha todos os campos corretamente."
      );
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const telefoneLimpo = somenteNumeros(telefone);
    const crpNumeroLimpo = crpNumero.trim();
    const crpUfLimpa = crpUf.trim().toUpperCase();
    const especialidadeLimpa = especialidade.trim();
    const biografiaLimpa = biografia.trim();

    // ======================================
    // VALIDAR DADOS PESSOAIS
    // ======================================

    if (
      nomeLimpo.length < 3 ||
      nomeLimpo.length > 150
    ) {
      return erro(
        res,
        400,
        "O nome deve ter entre 3 e 150 caracteres."
      );
    }

    if (!emailValido(emailLimpo)) {
      return erro(res, 400, "Informe um e-mail válido.");
    }

    if (senha.length < 8 || senha.length > 72) {
      return erro(
        res,
        400,
        "A senha deve ter entre 8 e 72 caracteres."
      );
    }

    if (!/^\d{10,11}$/.test(telefoneLimpo)) {
      return erro(res, 400, "Informe um telefone válido.");
    }

    // ======================================
    // VALIDAR DADOS PROFISSIONAIS FICTÍCIOS
    // ======================================

    if (!/^\d{4,30}$/.test(crpNumeroLimpo)) {
      return erro(
        res,
        400,
        "Informe um identificador profissional fictício válido."
      );
    }

    if (!ufValida(crpUfLimpa)) {
      return erro(res, 400, "Informe a UF do CRP.");
    }

    if (
      especialidadeLimpa.length < 3 ||
      especialidadeLimpa.length > 200
    ) {
      return erro(
        res,
        400,
        "Informe uma especialidade válida."
      );
    }

    if (biografiaLimpa.length > 5000) {
      return erro(
        res,
        400,
        "A biografia deve ter no máximo 5000 caracteres."
      );
    }

    const valor = valorMonetario(valorConsulta);

    if (!valor) {
      return erro(
        res,
        400,
        "Informe um valor de consulta válido."
      );
    }

    // ======================================
    // VALIDAR ENDEREÇO
    // ======================================

    const camposObrigatorios = [
      "cep",
      "logradouro",
      "numero",
      "bairro",
      "cidade",
      "uf",
    ] as const;

    for (const campo of camposObrigatorios) {
      if (
        typeof endereco[campo] !== "string" ||
        !endereco[campo].trim()
      ) {
        return erro(
          res,
          400,
          `Informe corretamente o campo ${campo} do endereço.`
        );
      }
    }

    if (
      endereco.complemento !== undefined &&
      typeof endereco.complemento !== "string"
    ) {
      return erro(
        res,
        400,
        "Complemento do endereço inválido."
      );
    }

    const cep = somenteNumeros(endereco.cep);
    const ufEndereco = endereco.uf.trim().toUpperCase();

    if (!/^\d{8}$/.test(cep)) {
      return erro(res, 400, "Informe um CEP válido.");
    }

    if (!ufValida(ufEndereco)) {
      return erro(
        res,
        400,
        "Informe uma UF válida para o endereço."
      );
    }

    const limitesEndereco = {
      logradouro: 200,
      numero: 30,
      complemento: 150,
      bairro: 100,
      cidade: 100,
    } as const;

    for (const [campo, limite] of Object.entries(
      limitesEndereco
    )) {
      const valorCampo =
        campo === "complemento"
          ? endereco.complemento ?? ""
          : endereco[campo];

      if (
        typeof valorCampo !== "string" ||
        valorCampo.trim().length > limite
      ) {
        return erro(
          res,
          400,
          `O campo ${campo} do endereço excede o limite permitido.`
        );
      }
    }

    // ======================================
    // CRIPTOGRAFAR SENHA
    // ======================================

    const senhaHash = await bcrypt.hash(senha, 12);

    // ======================================
    // CADASTRAR USUÁRIO, PERFIL E ENDEREÇO
    // ======================================

    const usuario = await prisma.usuario.create({
      data: {
        nome: nomeLimpo,
        email: emailLimpo,
        senhaHash,
        tipo: "PSICOLOGO",
        ativo: true,

        perfilPsicologo: {
          create: {
            crpNumero: crpNumeroLimpo,
            crpUf: crpUfLimpa,
            telefone: telefoneLimpo,
            especialidade: especialidadeLimpa,
            biografia: biografiaLimpa,
            valorConsulta: valor,
            status: "PENDENTE",

            endereco: {
              create: {
                cep,
                logradouro: endereco.logradouro.trim(),
                numero: endereco.numero.trim(),
                complemento:
                  endereco.complemento?.trim() || null,
                bairro: endereco.bairro.trim(),
                cidade: endereco.cidade.trim(),
                uf: ufEndereco,
              },
            },
          },
        },
      },

      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,

        perfilPsicologo: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message:
        "Cadastro demonstrativo realizado com sucesso. O perfil está aguardando aprovação simulada.",
      usuario,
      modoDemonstracao: true,
      aviso:
        "Perfil fictício. Nenhum registro profissional foi validado oficialmente.",
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return erro(
        res,
        409,
        "Já existe um cadastro com este e-mail ou identificador profissional fictício."
      );
    }

    console.error("Erro ao cadastrar psicólogo:", error);

    return erro(
      res,
      500,
      "Não foi possível realizar o cadastro."
    );
  }
});

// ==========================================
// CATÁLOGO PÚBLICO DE PSICÓLOGOS FICTÍCIOS
// GET /api/psicologos/publicos
// ==========================================

router.get("/publicos", async (req, res) => {
  try {
    if (!modoValido) {
      return erro(
        res,
        503,
        "O modo de operação do sistema não está configurado corretamente."
      );
    }

    if (!modoDemonstracao) {
      return erro(
        res,
        403,
        "O catálogo demonstrativo está disponível somente no ambiente de demonstração."
      );
    }

    // ======================================
    // FILTROS
    // ======================================

    const nome =
      typeof req.query.nome === "string"
        ? req.query.nome.trim()
        : "";

    const especialidade =
      typeof req.query.especialidade === "string"
        ? req.query.especialidade.trim()
        : "";

    if (
      nome.length > 100 ||
      especialidade.length > 100
    ) {
      return erro(
        res,
        400,
        "Os filtros devem conter no máximo 100 caracteres."
      );
    }

    // ======================================
    // PAGINAÇÃO
    // ======================================

    const paginaInformada =
      typeof req.query.pagina === "string"
        ? req.query.pagina
        : "1";

    const limiteInformado =
      typeof req.query.limite === "string"
        ? req.query.limite
        : "12";

    if (
      !/^[1-9]\d*$/.test(paginaInformada) ||
      !/^[1-9]\d*$/.test(limiteInformado)
    ) {
      return erro(
        res,
        400,
        "Parâmetros de paginação inválidos."
      );
    }

    const pagina = Number(paginaInformada);
    const limite = Number(limiteInformado);

    if (
      !Number.isSafeInteger(pagina) ||
      !Number.isSafeInteger(limite) ||
      pagina > 1000 ||
      limite > 30
    ) {
      return erro(
        res,
        400,
        "A página deve ser de 1 a 1000 e o limite de 1 a 30."
      );
    }

    const skip = (pagina - 1) * limite;

    // ======================================
    // CONSULTAR PERFIS APROVADOS
    // ======================================

    const where = {
      status: "APROVADO" as const,

      usuario: {
        is: {
          ativo: true,

          ...(nome
            ? {
                nome: {
                  contains: nome,
                  mode: "insensitive" as const,
                },
              }
            : {}),
        },
      },

      ...(especialidade
        ? {
            especialidade: {
              contains: especialidade,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [total, psicologos] = await prisma.$transaction([
      prisma.perfilPsicologo.count({
        where,
      }),

      prisma.perfilPsicologo.findMany({
        where,

        select: {
          id: true,
          especialidade: true,
          biografia: true,
          valorConsulta: true,

          usuario: {
            select: {
              nome: true,
            },
          },
        },

        orderBy: {
          criadoEm: "desc",
        },

        skip,
        take: limite,
      }),
    ]);

    // ======================================
    // FORMATAR RESPOSTA PÚBLICA
    // ======================================

    const profissionais = psicologos.map((psicologo) => ({
      id: psicologo.id,
      nome: psicologo.usuario.nome,
      especialidade: psicologo.especialidade,
      biografia: psicologo.biografia,
      valorConsulta: psicologo.valorConsulta.toString(),
      perfilFicticio: true,
      aprovacaoSimulada: true,
    }));

    return res.status(200).json({
      success: true,

      appMode: APP_MODE,
      modoDemonstracao: true,

      aviso:
        "Catálogo demonstrativo com profissionais fictícios. Nenhum registro profissional foi validado oficialmente.",

      profissionais,

      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas: Math.ceil(total / limite),
      },
    });
  } catch (error) {
    console.error(
      "Erro ao consultar catálogo público:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível consultar os profissionais."
    );
  }
});

// ==========================================
// CONSULTAR PERFIL DO PSICÓLOGO AUTENTICADO
// GET /api/psicologos/me
// ==========================================

router.get("/me", async (req, res) => {
  try {
    const usuarioId = await autenticarPsicologo(req, res);

    if (!usuarioId) {
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },

      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,

        perfilPsicologo: {
          select: {
            id: true,
            crpNumero: true,
            crpUf: true,
            telefone: true,
            especialidade: true,
            biografia: true,
            valorConsulta: true,
            status: true,
            aprovadoEm: true,
            criadoEm: true,
            atualizadoEm: true,

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
        },
      },
    });

    if (!usuario) {
      return erro(res, 404, "Usuário não encontrado.");
    }

    if (!usuario.perfilPsicologo) {
      return erro(
        res,
        403,
        "Perfil de psicólogo não encontrado para este usuário."
      );
    }

    const perfil = {
      ...usuario.perfilPsicologo,
      valorConsulta:
        usuario.perfilPsicologo.valorConsulta.toString(),
    };

    const dadosUsuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
      ativo: usuario.ativo,
    };

    return res.status(200).json({
      success: true,

      // Compatibilidade com as páginas do frontend
      usuario: dadosUsuario,
      perfil,

      // Compatibilidade com integrações anteriores
      data: {
        ...dadosUsuario,
        perfilPsicologo: perfil,
      },

      modoDemonstracao,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar perfil do psicólogo:",
      error
    );

    return erro(
      res,
      500,
      "Erro interno do servidor."
    );
  }
});

// ==========================================
// ATUALIZAR PERFIL DO PSICÓLOGO
// PATCH /api/psicologos/me
// ==========================================

router.patch("/me", async (req, res) => {
  try {
    if (!modoDemonstracao) {
      return erro(
        res,
        403,
        "A edição demonstrativa está disponível somente no modo demo."
      );
    }

    if (!origemPermitida(req)) {
      return erro(
        res,
        403,
        "Origem da solicitação não permitida."
      );
    }

    const usuarioId = await autenticarPsicologo(req, res);

    if (!usuarioId) {
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: {
        id: usuarioId,
      },

      select: {
        id: true,
        perfilPsicologo: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!usuario?.perfilPsicologo) {
      return erro(
        res,
        404,
        "Perfil profissional não encontrado."
      );
    }

    const dados = req.body;

    if (
      !dados ||
      typeof dados !== "object" ||
      Array.isArray(dados)
    ) {
      return erro(
        res,
        400,
        "Informe os dados que deseja atualizar."
      );
    }

    // ======================================
    // IMPEDIR ALTERAÇÃO DE CAMPOS PROTEGIDOS
    // ======================================

    const camposPermitidos = new Set([
      "nome",
      "telefone",
      "especialidade",
      "biografia",
      "valorConsulta",
      "endereco",
    ]);

    for (const campo of Object.keys(dados)) {
      if (!camposPermitidos.has(campo)) {
        return erro(
          res,
          400,
          `O campo ${campo} não pode ser alterado nesta página.`
        );
      }
    }

    if (Object.keys(dados).length === 0) {
      return erro(
        res,
        400,
        "Nenhum dado foi informado para atualização."
      );
    }

    const dadosUsuario: {
      nome?: string;
    } = {};

    const dadosPerfil: {
      telefone?: string;
      especialidade?: string;
      biografia?: string;
      valorConsulta?: Prisma.Decimal;
    } = {};

    // ======================================
    // VALIDAR NOME
    // ======================================

    if (dados.nome !== undefined) {
      if (typeof dados.nome !== "string") {
        return erro(res, 400, "Nome inválido.");
      }

      const nome = texto(dados.nome);

      if (nome.length < 3 || nome.length > 150) {
        return erro(
          res,
          400,
          "O nome deve ter entre 3 e 150 caracteres."
        );
      }

      dadosUsuario.nome = nome;
    }

    // ======================================
    // VALIDAR TELEFONE
    // ======================================

    if (dados.telefone !== undefined) {
      if (typeof dados.telefone !== "string") {
        return erro(res, 400, "Telefone inválido.");
      }

      const telefone = somenteNumeros(dados.telefone);

      if (!/^\d{10,11}$/.test(telefone)) {
        return erro(
          res,
          400,
          "Informe um telefone válido."
        );
      }

      dadosPerfil.telefone = telefone;
    }

    // ======================================
    // VALIDAR ESPECIALIDADE
    // ======================================

    if (dados.especialidade !== undefined) {
      if (typeof dados.especialidade !== "string") {
        return erro(res, 400, "Especialidade inválida.");
      }

      const especialidade = texto(dados.especialidade);

      if (
        especialidade.length < 3 ||
        especialidade.length > 200
      ) {
        return erro(
          res,
          400,
          "Informe uma especialidade válida."
        );
      }

      dadosPerfil.especialidade = especialidade;
    }

    // ======================================
    // VALIDAR BIOGRAFIA
    // ======================================

    if (dados.biografia !== undefined) {
      if (typeof dados.biografia !== "string") {
        return erro(res, 400, "Biografia inválida.");
      }

      const biografia = texto(dados.biografia);

      if (biografia.length > 5000) {
        return erro(
          res,
          400,
          "A biografia deve ter no máximo 5000 caracteres."
        );
      }

      dadosPerfil.biografia = biografia;
    }

    // ======================================
    // VALIDAR VALOR
    // ======================================

    if (dados.valorConsulta !== undefined) {
      const valor = valorMonetario(
        dados.valorConsulta
      );

      if (!valor) {
        return erro(
          res,
          400,
          "Informe um valor de consulta válido."
        );
      }

      dadosPerfil.valorConsulta = valor;
    }

    // ======================================
    // VALIDAR ENDEREÇO
    // ======================================

    let dadosEndereco:
      | {
          cep: string;
          logradouro: string;
          numero: string;
          complemento: string | null;
          bairro: string;
          cidade: string;
          uf: string;
        }
      | undefined;

    if (dados.endereco !== undefined) {
      const endereco = dados.endereco;

      if (
        !endereco ||
        typeof endereco !== "object" ||
        Array.isArray(endereco)
      ) {
        return erro(
          res,
          400,
          "Endereço inválido."
        );
      }

      const camposObrigatorios = [
        "cep",
        "logradouro",
        "numero",
        "bairro",
        "cidade",
        "uf",
      ] as const;

      for (const campo of camposObrigatorios) {
        if (
          typeof endereco[campo] !== "string" ||
          !endereco[campo].trim()
        ) {
          return erro(
            res,
            400,
            `Informe corretamente o campo ${campo} do endereço.`
          );
        }
      }

      if (
        endereco.complemento !== undefined &&
        typeof endereco.complemento !== "string"
      ) {
        return erro(
          res,
          400,
          "Complemento inválido."
        );
      }

      const cep = somenteNumeros(endereco.cep);
      const uf = texto(endereco.uf).toUpperCase();

      if (!/^\d{8}$/.test(cep)) {
        return erro(res, 400, "CEP inválido.");
      }

      if (!ufValida(uf)) {
        return erro(res, 400, "UF inválida.");
      }

      const logradouro = texto(endereco.logradouro);
      const numero = texto(endereco.numero);
      const complemento = texto(
        endereco.complemento ?? ""
      );
      const bairro = texto(endereco.bairro);
      const cidade = texto(endereco.cidade);

      if (
        logradouro.length > 200 ||
        numero.length > 30 ||
        complemento.length > 150 ||
        bairro.length > 100 ||
        cidade.length > 100
      ) {
        return erro(
          res,
          400,
          "Um ou mais campos do endereço excedem o limite permitido."
        );
      }

      dadosEndereco = {
        cep,
        logradouro,
        numero,
        complemento: complemento || null,
        bairro,
        cidade,
        uf,
      };
    }

    // ======================================
    // SALVAR EM TRANSAÇÃO
    // ======================================

    await prisma.$transaction(async (tx) => {
      if (Object.keys(dadosUsuario).length > 0) {
        await tx.usuario.update({
          where: {
            id: usuarioId,
          },
          data: dadosUsuario,
        });
      }

      await tx.perfilPsicologo.update({
        where: {
          id: usuario.perfilPsicologo!.id,
        },
        data: {
          ...dadosPerfil,

          ...(dadosEndereco
            ? {
                endereco: {
                  upsert: {
                    create: dadosEndereco,
                    update: dadosEndereco,
                  },
                },
              }
            : {}),
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso.",
      modoDemonstracao: true,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar perfil do psicólogo:",
      error
    );

    return erro(
      res,
      500,
      "Não foi possível atualizar o perfil."
    );
  }
});

export default router;