"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
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

type FiltroStatus = StatusPsicologo | "";

type Psicologo = {
  id: string;
  nome: string;
  email: string;
  usuarioAtivo: boolean;
  crpNumero: string;
  crpUf: string;
  especialidade: string | null;
  valorConsulta: string;
  status: StatusPsicologo;
  criadoEm: string;
  aprovadoEm: string | null;
};

type Paginacao = {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
};

type RespostaPsicologos = {
  success: boolean;
  psicologos?: Psicologo[];
  paginacao?: Paginacao;
  message?: string;
};

// ==========================================
// FILTROS
// ==========================================

const OPCOES_STATUS: {
  valor: FiltroStatus;
  nome: string;
}[] = [
  { valor: "", nome: "Todos os status" },
  { valor: "PENDENTE", nome: "Pendentes" },
  { valor: "APROVADO", nome: "Aprovados" },
  { valor: "REJEITADO", nome: "Rejeitados" },
  { valor: "SUSPENSO", nome: "Suspensos" },
  { valor: "RASCUNHO", nome: "Rascunhos" },
];

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarData(data: string | null) {
  if (!data) return "—";

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
}

function formatarMoeda(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function nomeStatus(status: StatusPsicologo) {
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

export default function GestaoPsicologosPage() {
  const router = useRouter();

  const [psicologos, setPsicologos] =
    useState<Psicologo[]>([]);

  const [paginacao, setPaginacao] =
    useState<Paginacao | null>(null);

  const [pagina, setPagina] = useState(1);

  const [buscaDigitada, setBuscaDigitada] = useState("");
  const [busca, setBusca] = useState("");

  const [status, setStatus] =
    useState<FiltroStatus>("");

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // ==========================================
  // CARREGAR PSICÓLOGOS
  // ==========================================

  const carregarPsicologos = useCallback(
    async (signal: AbortSignal) => {
      setCarregando(true);
      setErro("");

      try {
        const parametros = new URLSearchParams({
          pagina: String(pagina),
          limite: String(LIMITE),
        });

        if (status) {
          parametros.set("status", status);
        }

        if (busca) {
          parametros.set("busca", busca);
        }

        const resposta = await fetch(
          `${API_URL}/api/admin/psicologos?${parametros.toString()}`,
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

        const dados: RespostaPsicologos =
          await resposta.json();

        if (signal.aborted) return;

        if (!resposta.ok || !dados.success) {
          throw new Error(
            dados.message ||
              "Não foi possível carregar os psicólogos."
          );
        }

        if (!dados.psicologos || !dados.paginacao) {
          throw new Error(
            "O servidor retornou dados incompletos."
          );
        }

        setPsicologos(dados.psicologos);
        setPaginacao(dados.paginacao);
      } catch (error) {
        if (signal.aborted) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao consultar psicólogos."
        );
      } finally {
        if (!signal.aborted) {
          setCarregando(false);
        }
      }
    },
    [pagina, busca, status, router]
  );

  // ==========================================
  // EXECUTAR CONSULTA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    void carregarPsicologos(controller.signal);

    return () => {
      controller.abort();
    };
  }, [carregarPsicologos]);

  // ==========================================
  // PESQUISAR
  // ==========================================

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const termo = buscaDigitada.trim();

    if (termo.length > 100) {
      setErro(
        "A pesquisa deve ter no máximo 100 caracteres."
      );
      return;
    }

    setPagina(1);
    setBusca(termo);
  }

  // ==========================================
  // LIMPAR FILTROS
  // ==========================================

  function limparFiltros() {
    setBuscaDigitada("");
    setBusca("");
    setStatus("");
    setPagina(1);
  }

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">

      {/* ======================================
          CABEÇALHO SERENVIA
      ====================================== */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">

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

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">

        {/* ======================================
            APRESENTAÇÃO
        ====================================== */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-7 py-9 text-white sm:px-10">

          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Administração
          </span>

          <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">
            Gestão de psicólogos
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-teal-50">
            Consulte os perfis profissionais
            demonstrativos, pesquise por nome,
            e-mail ou CRP fictício e acompanhe
            a situação de cada cadastro.
          </p>

          {paginacao && (
            <div className="mt-6 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
              {paginacao.total} profissional(is) encontrado(s)
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
            Os perfis profissionais são fictícios
            e os números de CRP são utilizados
            apenas para simulação.
            Não existe validação oficial do
            registro profissional, e as decisões
            administrativas são demonstrativas.
          </p>
        </section>

        {/* ======================================
            FILTROS
        ====================================== */}

        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">

          <h2 className="text-xl font-semibold">
            Pesquisar profissionais
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Utilize os filtros para localizar
            cadastros demonstrativos.
          </p>

          <form
            onSubmit={pesquisar}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_auto_auto]"
          >
            {/* CAMPO DE PESQUISA */}

            <div>
              <label
                htmlFor="busca"
                className="mb-2 block text-sm font-medium"
              >
                Nome, e-mail ou CRP
              </label>

              <input
                id="busca"
                type="search"
                value={buscaDigitada}
                onChange={(evento) =>
                  setBuscaDigitada(evento.target.value)
                }
                maxLength={100}
                placeholder="Digite para pesquisar..."
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* FILTRO DE STATUS */}

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-medium"
              >
                Situação
              </label>

              <select
                id="status"
                value={status}
                onChange={(evento) => {
                  setStatus(
                    evento.target.value as FiltroStatus
                  );

                  setPagina(1);
                }}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              >
                {OPCOES_STATUS.map((opcao) => (
                  <option
                    key={opcao.valor}
                    value={opcao.valor}
                  >
                    {opcao.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÃO PESQUISAR */}

            <button
              type="submit"
              className="self-end rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900"
            >
              Pesquisar
            </button>

            {/* BOTÃO LIMPAR */}

            <button
              type="button"
              onClick={limparFiltros}
              className="self-end rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold transition hover:bg-stone-100"
            >
              Limpar
            </button>
          </form>
        </section>

        {/* ======================================
            RESULTADOS
        ====================================== */}

        {carregando ? (
          <section
            role="status"
            className="mt-8 rounded-3xl border border-stone-200 bg-white p-10 text-center text-slate-600 shadow-sm"
          >
            Carregando profissionais...
          </section>
        ) : erro ? (
          <section
            role="alert"
            className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8"
          >
            <h2 className="font-semibold text-red-800">
              Erro ao carregar profissionais
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
        ) : psicologos.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-lg font-semibold">
              Nenhum psicólogo encontrado
            </h2>

            <p className="mt-3 text-sm text-slate-600">
              Não existem perfis demonstrativos
              correspondentes aos filtros selecionados.
            </p>
          </section>
        ) : (
          <section className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">

            <div className="border-b border-stone-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold">
                Profissionais cadastrados
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Lista de perfis profissionais
                utilizados na demonstração.
              </p>
            </div>

            {/* TABELA */}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">

                <thead className="bg-stone-50 text-slate-700">
                  <tr>
                    <th scope="col" className="px-5 py-4">
                      Profissional
                    </th>

                    <th scope="col" className="px-5 py-4">
                      CRP fictício
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Especialidade
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Consulta
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Status
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Cadastro
                    </th>

                    <th scope="col" className="px-5 py-4">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {psicologos.map((psicologo) => (
                    <tr
                      key={psicologo.id}
                      className="transition hover:bg-stone-50"
                    >
                      {/* PROFISSIONAL */}

                      <td className="px-5 py-5">
                        <p className="font-semibold text-slate-900">
                          {psicologo.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {psicologo.email}
                        </p>

                        {!psicologo.usuarioAtivo && (
                          <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                            Conta inativa
                          </span>
                        )}
                      </td>

                      {/* CRP */}

                      <td className="whitespace-nowrap px-5 py-5 text-slate-700">
                        {psicologo.crpUf} /{" "}
                        {psicologo.crpNumero}
                      </td>

                      {/* ESPECIALIDADE */}

                      <td className="px-5 py-5 text-slate-600">
                        {psicologo.especialidade ||
                          "Não informada"}
                      </td>

                      {/* VALOR */}

                      <td className="whitespace-nowrap px-5 py-5 font-medium text-slate-700">
                        {formatarMoeda(
                          psicologo.valorConsulta
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(
                            psicologo.status
                          )}`}
                        >
                          {nomeStatus(psicologo.status)}
                        </span>
                      </td>

                      {/* DATA */}

                      <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                        {formatarData(
                          psicologo.criadoEm
                        )}
                      </td>

                      {/* AÇÕES */}

                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/psicologos/${psicologo.id}`}
                          className="inline-flex rounded-xl border border-teal-200 px-4 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50"
                        >
                          Ver detalhes →
                        </Link>
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
              aria-label="Paginação dos psicólogos"
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
  © 2026 SERENVIA. Projeto demonstrativo desenvolvido
  por AW TECHNOLOGY.
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