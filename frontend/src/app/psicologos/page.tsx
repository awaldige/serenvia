"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Profissional = {
  id: string;
  nome: string;
  especialidade: string | null;
  biografia: string | null;
  valorConsulta: string;
  perfilFicticio: boolean;
  aprovacaoSimulada: boolean;
};

type RespostaCatalogo = {
  success: boolean;
  appMode?: string;
  modoDemonstracao?: boolean;
  aviso?: string;
  profissionais?: Profissional[];
  paginacao?: {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
  };
  message?: string;
};

function formatarMoeda(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Valor não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

export default function CatalogoPsicologosPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [nomeDigitado, setNomeDigitado] = useState("");
  const [especialidadeDigitada, setEspecialidadeDigitada] = useState("");

  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  // ==========================================
  // CONSULTAR CATÁLOGO PÚBLICO
  // ==========================================

  const carregarProfissionais = useCallback(
    async (signal: AbortSignal) => {
      setCarregando(true);
      setErro("");

      try {
        const parametros = new URLSearchParams({
          pagina: String(pagina),
          limite: "9",
        });

        if (nome) {
          parametros.set("nome", nome);
        }

        if (especialidade) {
          parametros.set("especialidade", especialidade);
        }

        const resposta = await fetch(
          `${API_URL}/api/psicologos/publicos?${parametros.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          }
        );

        const dados: RespostaCatalogo = await resposta.json();

        if (!resposta.ok || !dados.success) {
          throw new Error(
            dados.message || "Não foi possível consultar o catálogo."
          );
        }

        if (
          dados.modoDemonstracao !== true ||
          !Array.isArray(dados.profissionais) ||
          !dados.paginacao
        ) {
          throw new Error(
            "A API não retornou um catálogo demonstrativo válido."
          );
        }

        if (signal.aborted) return;

        setProfissionais(dados.profissionais);
        setTotalPaginas(dados.paginacao.totalPaginas);
        setTotal(dados.paginacao.total);

        setAviso(
          dados.aviso ||
            "Os profissionais exibidos são fictícios."
        );
      } catch (error) {
        if (signal.aborted) return;

        setProfissionais([]);
        setTotal(0);
        setTotalPaginas(0);

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao carregar profissionais."
        );
      } finally {
        if (!signal.aborted) {
          setCarregando(false);
        }
      }
    },
    [pagina, nome, especialidade]
  );

  useEffect(() => {
    const controller = new AbortController();

    void carregarProfissionais(controller.signal);

    return () => controller.abort();
  }, [carregarProfissionais]);

  // ==========================================
  // PESQUISAR PROFISSIONAIS
  // ==========================================

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setPagina(1);
    setNome(nomeDigitado.trim());
    setEspecialidade(especialidadeDigitada.trim());
  }

  // ==========================================
  // LIMPAR FILTROS
  // ==========================================

  function limparFiltros() {
    setNomeDigitado("");
    setEspecialidadeDigitada("");
    setNome("");
    setEspecialidade("");
    setPagina(1);
  }

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
            SEREN<span className="text-teal-600">VIA</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-700">
            <Link
              href="/"
              className="transition hover:text-teal-700"
            >
              Início
            </Link>

            <Link
              href="/login"
              className="transition hover:text-teal-700"
            >
              Entrar
            </Link>

            <Link
              href="/cadastro"
              className="rounded-full bg-teal-800 px-5 py-3 text-white transition hover:bg-teal-900"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      {/* ======================================
          APRESENTAÇÃO
      ====================================== */}

      <section className="bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-700 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider">
            SERENVIA • Plataforma demonstrativa
          </span>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Encontre profissionais e explore novos caminhos para o bem-estar.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-teal-50">
            Conheça os perfis demonstrativos do Serenvia,
            explore especialidades e descubra como a tecnologia
            pode facilitar a busca por profissionais de psicologia.
          </p>

          <p className="mt-5 text-sm font-medium text-teal-100">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-3 text-sm text-teal-100">
            Projeto de portfólio • Sem atendimento psicológico real
          </p>
        </div>
      </section>

      {/* ======================================
          AVISO DEMONSTRATIVO
      ====================================== */}

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <p className="font-bold text-violet-900">
            Ambiente de demonstração
          </p>

          <p className="mt-2 text-sm leading-6 text-violet-800">
            {aviso ||
              "Todos os perfis são fictícios. Nenhum registro profissional foi validado oficialmente."}{" "}
            Esta página não oferece atendimento psicológico real.
          </p>
        </div>
      </section>

      {/* ======================================
          PESQUISA E FILTROS
      ====================================== */}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              Encontrar psicólogos
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Utilize os filtros para explorar os profissionais
              fictícios cadastrados no Serenvia.
            </p>
          </div>

          <form
            onSubmit={pesquisar}
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
          >
            <div>
              <label
                htmlFor="nome"
                className="mb-2 block text-sm font-semibold"
              >
                Nome do profissional
              </label>

              <input
                id="nome"
                type="search"
                maxLength={100}
                value={nomeDigitado}
                onChange={(evento) =>
                  setNomeDigitado(evento.target.value)
                }
                placeholder="Digite um nome"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label
                htmlFor="especialidade"
                className="mb-2 block text-sm font-semibold"
              >
                Especialidade
              </label>

              <input
                id="especialidade"
                type="search"
                maxLength={100}
                value={especialidadeDigitada}
                onChange={(evento) =>
                  setEspecialidadeDigitada(evento.target.value)
                }
                placeholder="Ex.: Psicologia Clínica"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white transition hover:bg-teal-900 disabled:opacity-50"
            >
              Pesquisar
            </button>

            <button
              type="button"
              onClick={limparFiltros}
              className="rounded-xl border border-stone-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-stone-100"
            >
              Limpar
            </button>
          </form>
        </div>
      </section>

      {/* ======================================
          RESULTADOS
      ====================================== */}

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">
              Profissionais disponíveis para demonstração
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {carregando
                ? "Consultando profissionais..."
                : `${total} profissional(is) encontrado(s)`}
            </p>
          </div>

          <span className="rounded-full bg-teal-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-teal-800">
            Perfis fictícios
          </span>
        </div>

        {/* ERRO */}

        {erro && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            {erro}
          </div>
        )}

        {/* CARREGAMENTO */}

        {carregando && (
          <div
            role="status"
            className="rounded-2xl bg-white p-8 text-slate-600"
          >
            Carregando catálogo...
          </div>
        )}

        {/* SEM RESULTADOS */}

        {!carregando && !erro && profissionais.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
            <h3 className="text-xl font-semibold">
              Nenhum profissional encontrado
            </h3>

            <p className="mt-3 text-slate-600">
              Tente pesquisar outro nome ou especialidade.
            </p>
          </div>
        )}

        {/* CARTÕES PROFISSIONAIS */}

        {!carregando && !erro && profissionais.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {profissionais.map((profissional) => (
              <article
                key={profissional.id}
                className="flex h-full flex-col rounded-3xl border border-stone-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-2xl font-bold text-teal-800"
                  >
                    {profissional.nome.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {profissional.nome}
                    </h3>

                    <p className="mt-1 text-sm text-teal-700">
                      {profissional.especialidade ||
                        "Especialidade não informada"}
                    </p>
                  </div>
                </div>

                <span className="mt-6 w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                  Perfil fictício • Aprovação simulada
                </span>

                <p className="mt-5 line-clamp-5 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {profissional.biografia ||
                    "Apresentação profissional não informada."}
                </p>

                <div className="mt-auto border-t border-stone-100 pt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Valor demonstrativo da consulta
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-teal-800">
                    {formatarMoeda(profissional.valorConsulta)}
                  </p>

                  <p className="mt-3 text-xs text-slate-500">
                    Agendamentos reais indisponíveis.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* ======================================
            PAGINAÇÃO
        ====================================== */}

        {!carregando && !erro && totalPaginas > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((atual) => atual - 1)}
              className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold disabled:opacity-40"
            >
              ← Anterior
            </button>

            <span className="text-sm font-semibold text-slate-700">
              Página {pagina} de {totalPaginas}
            </span>

            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((atual) => atual + 1)}
              className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-semibold disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        )}
      </section>

      {/* ======================================
          RODAPÉ SERENVIA
      ====================================== */}

      <footer className="border-t border-stone-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
        <p className="text-lg font-semibold text-teal-800">
          SERENVIA
        </p>

        <p className="mt-2">
          Um caminho para o bem-estar emocional.
        </p>

        <p className="mt-4">
          Serenvia — Projeto demonstrativo desenvolvido
          por AW TECHNOLOGY.
        </p>

        <p className="mt-2 text-xs">
          Profissionais fictícios. Sem validação oficial de CRP
          ou prestação de serviços psicológicos reais.
        </p>
      </footer>
    </main>
  );
}