"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = "";

// ==========================================
// TIPOS
// ==========================================

type StatusPsicologo =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "REJEITADO"
  | "SUSPENSO";

type DecisaoPsicologo = "APROVADO" | "REJEITADO";

type AcaoStatus = "SUSPENDER" | "REATIVAR" | "REABRIR";

type Psicologo = {
  id: string;

  usuario: {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
  };

  crpNumero: string;
  crpUf: string;
  telefone: string;
  especialidade: string | null;
  biografia: string | null;
  valorConsulta: string;
  status: StatusPsicologo;
  criadoEm: string;
  atualizadoEm: string;
  aprovadoEm: string | null;

  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
  } | null;
};

type RespostaPsicologo = {
  success: boolean;
  appMode?: "demo" | "production";
  modoDemonstracao?: boolean;
  psicologo?: Psicologo;
  message?: string;
};

type RespostaOperacao = {
  success: boolean;
  message?: string;
  modoDemonstracao?: boolean;

  psicologo?: {
    id: string;
    status: StatusPsicologo;
  };
};

type Props = {
  id: string;
};

// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarData(data: string | null) {
  if (!data) return "Não informado";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
}

function formatarMoeda(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function formatarStatus(status: StatusPsicologo) {
  const nomes: Record<StatusPsicologo, string> = {
    RASCUNHO: "Rascunho",
    PENDENTE: "Pendente",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
    SUSPENSO: "Suspenso",
  };

  return nomes[status];
}

function classeStatus(status: StatusPsicologo) {
  switch (status) {
    case "APROVADO":
      return "bg-emerald-100 text-emerald-800";

    case "REJEITADO":
      return "bg-red-100 text-red-800";

    case "SUSPENSO":
      return "bg-slate-200 text-slate-800";

    case "PENDENTE":
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-blue-100 text-blue-800";
  }
}

// ==========================================
// COMPONENTE DE CAMPO
// ==========================================

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-stone-100 bg-[#faf9f6] p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </dt>

      <dd className="mt-2 break-words text-sm font-medium text-slate-900">
        {valor || "Não informado"}
      </dd>
    </div>
  );
}

// ==========================================
// VALIDAÇÃO DO CRP
// ==========================================

function validarVerificacaoCrp(
  confirmado: boolean,
  fonte: string,
  dataConsulta: string,
  resultado: string
): string | null {
  if (!confirmado) {
    return "Confirme que realizou a conferência oficial do CRP.";
  }

  if (
    fonte.trim().length < 10 ||
    fonte.trim().length > 500
  ) {
    return "Informe a fonte oficial consultada (10 a 500 caracteres).";
  }

  if (
    resultado.trim().length < 10 ||
    resultado.trim().length > 1000
  ) {
    return "Descreva o resultado da conferência (10 a 1000 caracteres).";
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataConsulta)) {
    return "Informe a data da consulta do CRP.";
  }

  const data = new Date(`${dataConsulta}T12:00:00.000Z`);

  if (
    Number.isNaN(data.getTime()) ||
    data.toISOString().slice(0, 10) !== dataConsulta ||
    data.getTime() > Date.now() ||
    data.getTime() <
      Date.now() - 30 * 24 * 60 * 60 * 1000
  ) {
    return "A consulta do CRP deve ter ocorrido nos últimos 30 dias.";
  }

  return null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AnalisePsicologoClient({ id }: Props) {
  const router = useRouter();

  const [psicologo, setPsicologo] =
    useState<Psicologo | null>(null);

  const [modoDemonstracao, setModoDemonstracao] =
    useState<boolean | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [fonteCrp, setFonteCrp] = useState("");
  const [dataConsulta, setDataConsulta] = useState("");
  const [resultadoCrp, setResultadoCrp] = useState("");
  const [crpConfirmado, setCrpConfirmado] = useState(false);

  const [justificativa, setJustificativa] = useState("");

  const [decisaoSelecionada, setDecisaoSelecionada] =
    useState<DecisaoPsicologo | null>(null);

  const [acaoSelecionada, setAcaoSelecionada] =
    useState<AcaoStatus | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [erroOperacao, setErroOperacao] = useState("");
  const [sucessoOperacao, setSucessoOperacao] = useState("");

  // ==========================================
  // CARREGAR PSICÓLOGO
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function carregarPsicologo() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/admin/psicologos/${encodeURIComponent(id)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        if (resposta.status === 403) {
          router.replace("/");
          return;
        }

        const dados: RespostaPsicologo = await resposta.json();

        if (
          !resposta.ok ||
          !dados.success ||
          !dados.psicologo
        ) {
          throw new Error(
            dados.message ||
              "Não foi possível consultar o cadastro."
          );
        }

        if (typeof dados.modoDemonstracao !== "boolean") {
          throw new Error(
            "O backend não informou o modo de operação."
          );
        }

        if (!controller.signal.aborted) {
          setPsicologo(dados.psicologo);
          setModoDemonstracao(dados.modoDemonstracao);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao consultar o cadastro."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    void carregarPsicologo();

    return () => controller.abort();
  }, [id, router]);

  // ==========================================
  // LIMPAR FORMULÁRIO
  // ==========================================

  function limparFormulario() {
    setFonteCrp("");
    setDataConsulta("");
    setResultadoCrp("");
    setCrpConfirmado(false);
    setJustificativa("");
    setDecisaoSelecionada(null);
    setAcaoSelecionada(null);
  }

  // ==========================================
  // VALIDAÇÕES
  // ==========================================

  function validarJustificativa() {
    const tamanho = justificativa.trim().length;

    if (tamanho < 10 || tamanho > 2000) {
      return "A justificativa deve conter entre 10 e 2000 caracteres.";
    }

    return null;
  }

  function validarDecisao(decisao: DecisaoPsicologo) {
    if (!psicologo || psicologo.status !== "PENDENTE") {
      return "Este cadastro não está disponível para decisão.";
    }

    if (!psicologo.usuario.ativo) {
      return "Não é possível decidir sobre um usuário inativo.";
    }

    if (modoDemonstracao === null) {
      return "O modo de operação ainda não foi identificado.";
    }

    const erroJustificativa = validarJustificativa();

    if (erroJustificativa) return erroJustificativa;

    if (
      decisao === "APROVADO" &&
      modoDemonstracao === false
    ) {
      return validarVerificacaoCrp(
        crpConfirmado,
        fonteCrp,
        dataConsulta,
        resultadoCrp
      );
    }

    return null;
  }

  function validarAcao(acao: AcaoStatus) {
    if (!psicologo) {
      return "Psicólogo não encontrado.";
    }

    if (modoDemonstracao === null) {
      return "O modo de operação ainda não foi identificado.";
    }

    if (
      acao === "SUSPENDER" &&
      psicologo.status !== "APROVADO"
    ) {
      return "Somente psicólogos aprovados podem ser suspensos.";
    }

    if (
      acao === "REATIVAR" &&
      psicologo.status !== "SUSPENSO"
    ) {
      return "Somente psicólogos suspensos podem ser reativados.";
    }

    if (
      acao === "REABRIR" &&
      psicologo.status !== "REJEITADO"
    ) {
      return "Somente cadastros rejeitados podem ser reabertos.";
    }

    if (
      (acao === "REATIVAR" || acao === "REABRIR") &&
      !psicologo.usuario.ativo
    ) {
      return "Não é possível realizar esta operação em uma conta inativa.";
    }

    const erroJustificativa = validarJustificativa();

    if (erroJustificativa) return erroJustificativa;

    if (
      acao === "REATIVAR" &&
      modoDemonstracao === false
    ) {
      return validarVerificacaoCrp(
        crpConfirmado,
        fonteCrp,
        dataConsulta,
        resultadoCrp
      );
    }

    return null;
  }

  // ==========================================
  // SELECIONAR OPERAÇÃO
  // ==========================================

  function selecionarDecisao(decisao: DecisaoPsicologo) {
    setErroOperacao("");
    setSucessoOperacao("");

    const erroValidacao = validarDecisao(decisao);

    if (erroValidacao) {
      setErroOperacao(erroValidacao);
      setDecisaoSelecionada(null);
      return;
    }

    setAcaoSelecionada(null);
    setDecisaoSelecionada(decisao);
  }

  function selecionarAcao(acao: AcaoStatus) {
    setErroOperacao("");
    setSucessoOperacao("");

    const erroValidacao = validarAcao(acao);

    if (erroValidacao) {
      setErroOperacao(erroValidacao);
      setAcaoSelecionada(null);
      return;
    }

    setDecisaoSelecionada(null);
    setAcaoSelecionada(acao);
  }

  // ==========================================
  // ENVIAR OPERAÇÃO
  // ==========================================

  async function enviarOperacao(
    evento: FormEvent<HTMLFormElement>,
    tipo: "DECISAO" | "STATUS"
  ) {
    evento.preventDefault();

    if (!psicologo || enviando) return;

    const decisao =
      tipo === "DECISAO" ? decisaoSelecionada : null;

    const acao =
      tipo === "STATUS" ? acaoSelecionada : null;

    if (tipo === "DECISAO" && !decisao) return;
    if (tipo === "STATUS" && !acao) return;

    const erroValidacao =
      tipo === "DECISAO"
        ? validarDecisao(decisao!)
        : validarAcao(acao!);

    if (erroValidacao) {
      setErroOperacao(erroValidacao);
      setDecisaoSelecionada(null);
      setAcaoSelecionada(null);
      return;
    }

    // Verificação de CRP somente quando exigida
    // e nunca durante a reabertura da análise.

    const precisaCrp =
      modoDemonstracao === false &&
      (decisao === "APROVADO" || acao === "REATIVAR");

    const verificacaoCrp = precisaCrp
      ? {
          confirmado: crpConfirmado,
          fonte: fonteCrp.trim(),
          dataConsulta,
          resultado: resultadoCrp.trim(),
        }
      : undefined;

    // ======================================
    // DEFINIR ROTA E CORPO
    // ======================================

    let caminho: "decisao" | "status" | "reabrir";

    let corpo:
      | {
          decisao: DecisaoPsicologo;
          justificativa: string;
          verificacaoCrp?: typeof verificacaoCrp;
        }
      | {
          acao: "SUSPENDER" | "REATIVAR";
          justificativa: string;
          verificacaoCrp?: typeof verificacaoCrp;
        }
      | {
          justificativa: string;
        };

    if (tipo === "DECISAO" && decisao) {
      caminho = "decisao";

      corpo = {
        decisao,
        justificativa: justificativa.trim(),
        ...(verificacaoCrp ? { verificacaoCrp } : {}),
      };
    } else if (acao === "REABRIR") {
      caminho = "reabrir";

      corpo = {
        justificativa: justificativa.trim(),
      };
    } else if (acao === "SUSPENDER" || acao === "REATIVAR") {
      caminho = "status";

      corpo = {
        acao,
        justificativa: justificativa.trim(),
        ...(verificacaoCrp ? { verificacaoCrp } : {}),
      };
    } else {
      setErroOperacao("Operação inválida.");
      return;
    }

    setEnviando(true);
    setErroOperacao("");
    setSucessoOperacao("");

    try {
      const resposta = await fetch(
        `${API_URL}/api/admin/psicologos/${encodeURIComponent(id)}/${caminho}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corpo),
        }
      );

      if (resposta.status === 401) {
        router.replace("/login");
        return;
      }

      if (resposta.status === 403) {
        const dadosErro = await resposta.json().catch(() => null);

        if (
          dadosErro?.message ===
          "Origem da requisição não autorizada."
        ) {
          throw new Error(dadosErro.message);
        }

        router.replace("/");
        return;
      }

      const dados: RespostaOperacao = await resposta.json();

      if (!resposta.ok || !dados.success || !dados.psicologo) {
        throw new Error(
          dados.message || "Não foi possível concluir a operação."
        );
      }

      // Atualização imediata do status na interface.

      setPsicologo((atual) =>
        atual
          ? {
              ...atual,
              status: dados.psicologo!.status,
              aprovadoEm:
                dados.psicologo!.status === "PENDENTE"
                  ? null
                  : atual.aprovadoEm,
            }
          : atual
      );

      // Buscar novamente os dados persistidos.

      try {
        const respostaAtualizada = await fetch(
          `${API_URL}/api/admin/psicologos/${encodeURIComponent(id)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (respostaAtualizada.ok) {
          const dadosAtualizados: RespostaPsicologo =
            await respostaAtualizada.json();

          if (
            dadosAtualizados.success &&
            dadosAtualizados.psicologo
          ) {
            setPsicologo(dadosAtualizados.psicologo);

            if (
              typeof dadosAtualizados.modoDemonstracao === "boolean"
            ) {
              setModoDemonstracao(
                dadosAtualizados.modoDemonstracao
              );
            }
          }
        }
      } catch (erroAtualizacao) {
        console.warn(
          "Operação concluída, mas não foi possível atualizar todos os dados:",
          erroAtualizacao
        );
      }

      limparFormulario();

      setSucessoOperacao(
        dados.message || "Operação registrada com sucesso."
      );

      router.refresh();
    } catch (error) {
      setErroOperacao(
        error instanceof Error
          ? error.message
          : "Erro ao registrar a operação."
      );

      setDecisaoSelecionada(null);
      setAcaoSelecionada(null);
    } finally {
      setEnviando(false);
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-wide text-teal-800">
            SERENVIA
          </p>

          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" />

          <p role="status" className="mt-5 text-sm text-slate-600">
            Carregando cadastro do psicólogo...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERRO
  // ==========================================

  if (erro) {
    return (
      <main className="min-h-screen bg-[#f8f7f4] px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
            SERENVIA
          </p>

          <h1 className="mt-4 text-xl font-bold text-red-700">
            Não foi possível abrir o cadastro
          </h1>

          <p className="mt-3 text-slate-600">{erro}</p>

          <Link
            href="/admin/psicologos"
            className="mt-6 inline-block font-medium text-teal-700 hover:underline"
          >
            ← Voltar à gestão de psicólogos
          </Link>
        </div>
      </main>
    );
  }

  if (!psicologo || modoDemonstracao === null) {
    return null;
  }

  // ==========================================
  // STATUS E VISIBILIDADE
  // ==========================================

  const pendente = psicologo.status === "PENDENTE";
  const aprovado = psicologo.status === "APROVADO";
  const rejeitado = psicologo.status === "REJEITADO";
  const suspenso = psicologo.status === "SUSPENSO";

  const endereco = psicologo.endereco;

  const mostrarJustificativa =
    pendente || aprovado || rejeitado || suspenso;

  const mostrarVerificacaoCrp =
    !modoDemonstracao && (pendente || suspenso);

  const nomeAcao =
    decisaoSelecionada === "APROVADO"
      ? "aprovar"
      : decisaoSelecionada === "REJEITADO"
      ? "rejeitar"
      : acaoSelecionada === "SUSPENDER"
      ? "suspender"
      : acaoSelecionada === "REATIVAR"
      ? "reativar"
      : acaoSelecionada === "REABRIR"
      ? "reabrir a análise de"
      : "alterar";

  // ==========================================
  // INTERFACE SERENVIA
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] px-4 py-10 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* NAVEGAÇÃO */}

        <Link
          href="/admin/psicologos"
          className="inline-flex items-center text-sm font-semibold text-teal-800 transition hover:text-teal-950"
        >
          ← Voltar à gestão de psicólogos
        </Link>

        {/* AVISO DEMONSTRATIVO */}

        {modoDemonstracao && (
          <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                Ambiente demonstrativo
              </span>

              <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Dados fictícios
              </span>
            </div>

            <h2 className="mt-5 text-xl font-semibold text-violet-950">
              Operações administrativas simuladas
            </h2>

            <p className="mt-3 text-sm leading-7 text-violet-900">
              O SERENVIA é um projeto demonstrativo desenvolvido
              pela AW TECHNOLOGY. Os perfis profissionais,
              registros e decisões apresentados neste ambiente
              são fictícios.
            </p>

            <p className="mt-3 text-sm leading-7 text-violet-900">
              As aprovações, rejeições, suspensões, reativações
              e reaberturas são simuladas. Nenhuma decisão
              representa validação oficial perante o Conselho
              Regional de Psicologia.
            </p>

            <p className="mt-3 text-xs font-medium leading-6 text-violet-800">
              Esta plataforma não realiza atendimentos
              psicológicos reais.
            </p>
          </section>
        )}

        {/* CABEÇALHO */}

        <header className="mt-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 p-8 text-white shadow-sm sm:p-10">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Administração
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Gestão do cadastro profissional
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-teal-50">
            Consulte as informações do profissional,
            acompanhe a situação do cadastro e realize
            as operações administrativas disponíveis.
          </p>

          <p className="mt-3 text-sm text-teal-100">
            Um caminho para o bem-estar emocional.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${classeStatus(
                psicologo.status
              )}`}
            >
              Situação: {formatarStatus(psicologo.status)}
              {modoDemonstracao ? " (simulada)" : ""}
            </span>

            {modoDemonstracao && (
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">
                Projeto de portfólio
              </span>
            )}
          </div>
        </header>

        {/* DADOS DO PROFISSIONAL */}

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-xl font-bold text-slate-900">
            Dados do profissional
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Informações de identificação e situação da conta.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Campo
              titulo="Nome completo"
              valor={psicologo.usuario.nome}
            />

            <Campo
              titulo="E-mail"
              valor={psicologo.usuario.email}
            />

            <Campo
              titulo="Telefone"
              valor={psicologo.telefone}
            />

            <Campo
              titulo="Situação da conta"
              valor={
                psicologo.usuario.ativo ? "Ativa" : "Inativa"
              }
            />
          </dl>
        </section>

        {/* INFORMAÇÕES PROFISSIONAIS */}

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-xl font-bold text-slate-900">
            Informações profissionais
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Dados apresentados no cadastro do profissional.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Campo
              titulo={
                modoDemonstracao
                  ? "CRP informado (fictício)"
                  : "Registro CRP informado"
              }
              valor={`CRP ${psicologo.crpUf} / ${psicologo.crpNumero}`}
            />

            <Campo
              titulo="Especialidade"
              valor={psicologo.especialidade || "Não informada"}
            />

            <Campo
              titulo={
                modoDemonstracao
                  ? "Valor demonstrativo da consulta"
                  : "Valor da consulta"
              }
              valor={formatarMoeda(psicologo.valorConsulta)}
            />

            <Campo
              titulo="Data do cadastro"
              valor={formatarData(psicologo.criadoEm)}
            />

            <Campo
              titulo="Última atualização"
              valor={formatarData(psicologo.atualizadoEm)}
            />

            <Campo
              titulo={
                modoDemonstracao
                  ? "Data da aprovação simulada"
                  : "Data da aprovação"
              }
              valor={formatarData(psicologo.aprovadoEm)}
            />
          </dl>

          <div className="mt-7 border-t border-stone-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Biografia
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {psicologo.biografia || "Não informada"}
            </p>
          </div>
        </section>

        {/* ENDEREÇO */}

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-xl font-bold text-slate-900">
            Endereço cadastrado
          </h2>

          {endereco ? (
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <Campo titulo="CEP" valor={endereco.cep} />
              <Campo
                titulo="Logradouro"
                valor={endereco.logradouro}
              />
              <Campo titulo="Número" valor={endereco.numero} />
              <Campo
                titulo="Complemento"
                valor={endereco.complemento || "Não informado"}
              />
              <Campo titulo="Bairro" valor={endereco.bairro} />
              <Campo titulo="Cidade" valor={endereco.cidade} />
              <Campo titulo="UF" valor={endereco.uf} />
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              Endereço não informado.
            </p>
          )}
        </section>

        {/* CONTROLE ADMINISTRATIVO */}

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-7 sm:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-amber-950">
              {modoDemonstracao
                ? "Controle administrativo demonstrativo"
                : "Controle administrativo do profissional"}
            </h2>

            {modoDemonstracao && (
              <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900">
                Simulação
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-7 text-amber-900">
            {modoDemonstracao
              ? "As aprovações, rejeições, reaberturas, suspensões e reativações são simuladas. Não existe validação oficial de CRP nem autorização para atendimento psicológico real."
              : "O CRP foi informado pelo profissional. Antes de aprovar ou reativar, consulte uma fonte oficial e confirme a identidade e a regularidade do registro."}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-5">
            <p className="text-lg font-semibold text-slate-900">
              {psicologo.usuario.nome}
            </p>

            <p className="mt-2 text-sm text-slate-700">
              CRP {psicologo.crpUf} / {psicologo.crpNumero}
            </p>

            <p className="mt-2 text-sm text-slate-700">
              Status atual:{" "}
              <strong>
                {formatarStatus(psicologo.status)}
                {modoDemonstracao ? " (simulado)" : ""}
              </strong>
            </p>
          </div>

          {mostrarJustificativa ? (
            <div className="mt-7 space-y-6">
              {/* VERIFICAÇÃO DO CRP */}

              {mostrarVerificacaoCrp && (
                <div className="space-y-5 rounded-2xl border border-amber-200 bg-white p-5">
                  <h3 className="text-lg font-bold text-slate-900">
                    Verificação oficial do CRP
                  </h3>

                  <p className="text-sm leading-6 text-slate-600">
                    Preencha os dados da conferência oficial
                    antes de aprovar ou reativar o profissional.
                  </p>

                  <div>
                    <label
                      htmlFor="fonteCrp"
                      className="block text-sm font-semibold text-slate-900"
                    >
                      Fonte oficial consultada
                    </label>

                    <input
                      id="fonteCrp"
                      type="text"
                      maxLength={500}
                      value={fonteCrp}
                      onChange={(evento) =>
                        setFonteCrp(evento.target.value)
                      }
                      placeholder="Informe o órgão ou a página oficial consultada"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="dataConsulta"
                      className="block text-sm font-semibold text-slate-900"
                    >
                      Data da consulta do CRP
                    </label>

                    <input
                      id="dataConsulta"
                      type="date"
                      value={dataConsulta}
                      onChange={(evento) =>
                        setDataConsulta(evento.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="resultadoCrp"
                      className="block text-sm font-semibold text-slate-900"
                    >
                      Resultado da verificação
                    </label>

                    <textarea
                      id="resultadoCrp"
                      rows={4}
                      maxLength={1000}
                      value={resultadoCrp}
                      onChange={(evento) =>
                        setResultadoCrp(evento.target.value)
                      }
                      placeholder="Descreva o resultado encontrado na fonte oficial"
                      className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <input
                      type="checkbox"
                      checked={crpConfirmado}
                      onChange={(evento) =>
                        setCrpConfirmado(evento.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-teal-700"
                    />

                    <span className="text-sm leading-6 text-slate-700">
                      Confirmo que consultei uma fonte oficial,
                      conferi a identidade do profissional,
                      o número do CRP e a regularidade do registro.
                    </span>
                  </label>
                </div>
              )}

              {/* JUSTIFICATIVA */}

              <div className="rounded-2xl border border-amber-200 bg-white p-5">
                <label
                  htmlFor="justificativa"
                  className="block text-sm font-semibold text-slate-900"
                >
                  {modoDemonstracao
                    ? "Justificativa da simulação"
                    : "Justificativa administrativa"}
                </label>

                <textarea
                  id="justificativa"
                  rows={5}
                  maxLength={2000}
                  value={justificativa}
                  onChange={(evento) =>
                    setJustificativa(evento.target.value)
                  }
                  placeholder={
                    rejeitado
                      ? "Exemplo: Reabrir a análise para reconsiderar o cadastro."
                      : modoDemonstracao
                      ? "Descreva o motivo da operação simulada."
                      : "Descreva os motivos da operação administrativa."
                  }
                  className="mt-3 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Obrigatório: entre 10 e 2000 caracteres.
                  </span>

                  <span>
                    {justificativa.trim().length}/2000
                  </span>
                </div>
              </div>

              {/* ERROS */}

              {erroOperacao && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
                >
                  {erroOperacao}
                </div>
              )}

              {/* APROVAR / REJEITAR */}

              {pendente && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={enviando || !psicologo.usuario.ativo}
                    onClick={() => selecionarDecisao("APROVADO")}
                    className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {modoDemonstracao
                      ? "Simular aprovação"
                      : "Aprovar psicólogo"}
                  </button>

                  <button
                    type="button"
                    disabled={enviando || !psicologo.usuario.ativo}
                    onClick={() => selecionarDecisao("REJEITADO")}
                    className="rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {modoDemonstracao
                      ? "Simular rejeição"
                      : "Rejeitar cadastro"}
                  </button>
                </div>
              )}

              {/* REABRIR ANÁLISE */}

              {rejeitado && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
                  <h3 className="text-lg font-bold text-violet-950">
                    Cadastro rejeitado
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-violet-900">
                    Este cadastro foi rejeitado anteriormente.
                    É possível reabrir a análise para que ele
                    retorne ao status pendente e receba uma
                    nova decisão administrativa.
                  </p>

                  <button
                    type="button"
                    disabled={enviando || !psicologo.usuario.ativo}
                    onClick={() => selecionarAcao("REABRIR")}
                    className="mt-5 rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {modoDemonstracao
                      ? "Simular reabertura da análise"
                      : "Reabrir análise"}
                  </button>
                </div>
              )}

              {/* SUSPENDER */}

              {aprovado && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => selecionarAcao("SUSPENDER")}
                  className="rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {modoDemonstracao
                    ? "Simular suspensão"
                    : "Suspender psicólogo"}
                </button>
              )}

              {/* REATIVAR */}

              {suspenso && (
                <button
                  type="button"
                  disabled={enviando || !psicologo.usuario.ativo}
                  onClick={() => selecionarAcao("REATIVAR")}
                  className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {modoDemonstracao
                    ? "Simular reativação"
                    : "Reativar psicólogo"}
                </button>
              )}

              {/* CONFIRMAÇÃO */}

              {(decisaoSelecionada || acaoSelecionada) && (
                <form
                  onSubmit={(evento) =>
                    enviarOperacao(
                      evento,
                      decisaoSelecionada ? "DECISAO" : "STATUS"
                    )
                  }
                  className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="text-lg font-bold text-slate-900">
                    {modoDemonstracao
                      ? "Confirmar operação simulada"
                      : "Confirmar operação administrativa"}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Você está prestes a{" "}
                    <strong>{nomeAcao}</strong>{" "}
                    o cadastro de{" "}
                    <strong>{psicologo.usuario.nome}</strong>.
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {modoDemonstracao
                      ? "Esta é uma operação fictícia. O sistema registrará a simulação no histórico de auditoria."
                      : "A alteração será registrada no histórico de auditoria com a justificativa e o administrador responsável."}
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={enviando}
                      className="rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {enviando
                        ? "Registrando operação..."
                        : modoDemonstracao
                        ? "Confirmar simulação"
                        : "Confirmar operação"}
                    </button>

                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => {
                        setDecisaoSelecionada(null);
                        setAcaoSelecionada(null);
                      }}
                      className="rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
              <p className="font-semibold text-slate-900">
                Nenhuma operação disponível
              </p>

              <p className="mt-2 text-sm text-slate-600">
                O status atual não permite novas operações
                administrativas.
              </p>
            </div>
          )}
        </section>

        {/* RESULTADO */}

        {sucessoOperacao && (
          <section
            role="status"
            className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-7"
          >
            <h2 className="text-lg font-bold text-emerald-900">
              {modoDemonstracao
                ? "Simulação registrada"
                : "Operação registrada"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-emerald-800">
              {sucessoOperacao}
            </p>

            <Link
              href="/admin/auditoria"
              className="mt-5 inline-block font-semibold text-teal-800 hover:underline"
            >
              Consultar histórico de auditoria →
            </Link>
          </section>
        )}

        {/* RODAPÉ */}

        <footer className="mt-12 border-t border-stone-200 pt-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold tracking-widest text-teal-800 hover:text-teal-950"
          >
            SERENVIA
          </Link>

          <p className="mt-2 text-sm text-slate-500">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 SERENVIA. Projeto demonstrativo desenvolvido
            por AW TECHNOLOGY.
          </p>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            Perfis fictícios • Aprovações simuladas •
            Sem validação oficial de CRP •
            Sem atendimento psicológico real
          </p>
        </footer>
      </div>
    </main>
  );
}