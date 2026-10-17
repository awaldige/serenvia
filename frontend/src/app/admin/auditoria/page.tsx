"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const LIMITE = 10;

// ==========================================
// TIPOS
// ==========================================

type StatusPsicologo =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "REJEITADO"
  | "SUSPENSO";

type Auditoria = {
  id: string;
  criadoEm: string;
  statusAnterior: StatusPsicologo;
  statusNovo: StatusPsicologo;
  justificativa: string;

  psicologo: {
    id: string;
    nome: string;
    email: string;
    crpNumero: string;
    crpUf: string;
  };

  administrador: {
    id: string;
    nome: string;
    email: string;
  };
};

type Paginacao = {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
};

type RespostaAuditoria = {
  success: boolean;
  auditorias?: Auditoria[];
  paginacao?: Paginacao;
  message?: string;
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarData(data: string) {
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

    case "PENDENTE":
      return "bg-amber-100 text-amber-800";

    case "SUSPENSO":
      return "bg-slate-200 text-slate-800";

    default:
      return "bg-blue-100 text-blue-800";
  }
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AuditoriaPage() {
  const router = useRouter();

  const [auditorias, setAuditorias] =
    useState<Auditoria[]>([]);

  const [paginacao, setPaginacao] =
    useState<Paginacao | null>(null);

  const [pagina, setPagina] = useState(1);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // ==========================================
  // CARREGAR AUDITORIAS
  // ==========================================

  const carregarAuditorias = useCallback(
    async (signal: AbortSignal) => {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(
          `${API_URL}/api/admin/auditoria?pagina=${pagina}&limite=${LIMITE}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

        if (signal.aborted) return;

        // Sessão não autenticada
        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        // Sem permissão administrativa
        if (resposta.status === 403) {
          router.replace("/");
          return;
        }

        const dados: RespostaAuditoria =
          await resposta.json();

        if (signal.aborted) return;

        if (!resposta.ok || !dados.success) {
          throw new Error(
            dados.message ||
              "Não foi possível carregar o histórico."
          );
        }

        if (!dados.auditorias || !dados.paginacao) {
          throw new Error(
            "O servidor retornou dados incompletos."
          );
        }

        setAuditorias(dados.auditorias);
        setPaginacao(dados.paginacao);
      } catch (error) {
        if (signal.aborted) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao consultar auditorias."
        );
      } finally {
        if (!signal.aborted) {
          setCarregando(false);
        }
      }
    },
    [pagina, router]
  );

  // ==========================================
  // EXECUTAR CONSULTA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    void carregarAuditorias(controller.signal);

    return () => {
      controller.abort();
    };
  }, [carregarAuditorias]);

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">

      {/* ======================================
          CABEÇALHO SERENVIA
      ====================================== */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            SEREN
            <span className="text-teal-600">
              VIA
            </span>
          </Link>

          <Link
            href="/admin"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-50"
          >
            ← Painel administrativo
          </Link>

        </div>
      </header>

      {/* ======================================
          CONTEÚDO PRINCIPAL
      ====================================== */}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* ======================================
            APRESENTAÇÃO
        ====================================== */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-7 py-9 text-white sm:px-10">

          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Administração
          </span>

          <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">
            Histórico de auditoria
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-teal-50">
            Consulte as decisões administrativas
            demonstrativas realizadas sobre os
            cadastros de psicólogos fictícios.
          </p>

          {paginacao && (
            <div className="mt-6 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              Total de decisões registradas:{" "}
              <strong className="ml-1">
                {paginacao.total}
              </strong>
            </div>
          )}
        </section>

        {/* ======================================
            AVISO DEMONSTRATIVO
        ====================================== */}

        <section className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="text-base font-semibold text-violet-900">
            Ambiente demonstrativo
          </h2>

          <p className="mt-2 text-sm leading-7 text-violet-800">
            O Serenvia é um projeto de portfólio
            desenvolvido pela AW TECHNOLOGY.
            Os perfis profissionais são fictícios,
            as decisões administrativas são simuladas
            e não existe validação oficial do CRP.
            Este histórico registra as alterações
            realizadas dentro da demonstração.
          </p>
        </section>

        {/* ======================================
            RESULTADOS
        ====================================== */}

        {carregando ? (
          <section
            role="status"
            className="mt-8 rounded-3xl border border-stone-200 bg-white p-10 text-center text-slate-600 shadow-sm"
          >
            Carregando histórico de auditoria...
          </section>
        ) : erro ? (
          <section
            role="alert"
            className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8"
          >
            <h2 className="font-semibold text-red-800">
              Não foi possível carregar o histórico
            </h2>

            <p className="mt-3 text-sm text-red-700">
              {erro}
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              Tentar novamente
            </button>
          </section>
        ) : auditorias.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold">
              Nenhuma auditoria encontrada
            </h2>

            <p className="mt-3 text-sm text-slate-600">
              Ainda não existem decisões administrativas
              registradas nesta página.
            </p>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">

            <div className="border-b border-stone-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold">
                Decisões registradas
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Histórico das alterações realizadas
                no ambiente demonstrativo.
              </p>
            </div>

            {/* TABELA */}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">

                <thead className="bg-stone-50 text-slate-700">
                  <tr>
                    <th scope="col" className="px-5 py-4">
                      Data
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Psicólogo
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Decisão
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Administrador
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Justificativa
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {auditorias.map((auditoria) => (
                    <tr
                      key={auditoria.id}
                      className="align-top transition hover:bg-stone-50"
                    >
                      {/* DATA */}

                      <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                        {formatarData(
                          auditoria.criadoEm
                        )}
                      </td>

                      {/* PSICÓLOGO */}

                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/psicologos/${auditoria.psicologo.id}`}
                          className="font-semibold text-teal-800 hover:underline"
                        >
                          {auditoria.psicologo.nome}
                        </Link>

                        <p className="mt-1 text-xs text-slate-500">
                          {auditoria.psicologo.email}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          CRP demonstrativo:{" "}
                          {auditoria.psicologo.crpUf} /{" "}
                          {auditoria.psicologo.crpNumero}
                        </p>
                      </td>

                      {/* DECISÃO */}

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                            auditoria.statusNovo
                          )}`}
                        >
                          {formatarStatus(
                            auditoria.statusNovo
                          )}
                        </span>

                        <p className="mt-2 text-xs text-slate-500">
                          Anterior:{" "}
                          {formatarStatus(
                            auditoria.statusAnterior
                          )}
                        </p>
                      </td>

                      {/* ADMINISTRADOR */}

                      <td className="px-5 py-5">
                        <p className="font-medium text-slate-900">
                          {auditoria.administrador.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {auditoria.administrador.email}
                        </p>
                      </td>

                      {/* JUSTIFICATIVA */}

                      <td className="max-w-sm px-5 py-5">
                        <details>
                          <summary className="cursor-pointer font-semibold text-teal-800 hover:underline">
                            Ver justificativa
                          </summary>

                          <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-4 text-xs leading-6 text-slate-700">
                            {auditoria.justificativa}
                          </p>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ======================================
            PAGINAÇÃO
        ====================================== */}

        {!carregando &&
          !erro &&
          paginacao &&
          paginacao.totalPaginas > 1 && (
            <nav
              aria-label="Paginação das auditorias"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() =>
                  setPagina((atual) =>
                    Math.max(1, atual - 1)
                  )
                }
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Anterior
              </button>

              <span className="text-sm text-slate-600">
                Página {paginacao.pagina} de{" "}
                {paginacao.totalPaginas}
              </span>

              <button
                type="button"
                disabled={
                  pagina >= paginacao.totalPaginas
                }
                onClick={() =>
                  setPagina((atual) => atual + 1)
                }
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima →
              </button>
            </nav>
          )}

        {/* ======================================
            RODAPÉ SERENVIA
        ====================================== */}

        <footer className="mt-12 border-t border-stone-200 pt-8 text-center">
          <p className="text-sm font-semibold text-teal-800">
            SERENVIA
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 SERENVIA. Projeto demonstrativo
            desenvolvido por AW TECHNOLOGY.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Perfis fictícios • Aprovação simulada •
            Sem atendimento psicológico real
          </p>
        </footer>
      </div>
    </main>
  );
}