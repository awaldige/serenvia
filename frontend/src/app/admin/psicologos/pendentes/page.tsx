"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ==========================================
// TIPOS
// ==========================================

type PsicologoPendente = {
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
  status: "PENDENTE";
  criadoEm: string;
  atualizadoEm: string;

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

type RespostaPendentes = {
  success: boolean;
  total: number;
  psicologos: PsicologoPendente[];
  message?: string;
};

// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarData(data: string) {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
}

function formatarValor(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

// ==========================================
// PÁGINA
// ==========================================

export default function PsicologosPendentesPage() {
  const router = useRouter();

  const [psicologos, setPsicologos] = useState<
    PsicologoPendente[]
  >([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // ==========================================
  // CONSULTAR PSICÓLOGOS PENDENTES
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function carregarPsicologos() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/admin/psicologos/pendentes`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        // Usuário sem autenticação
        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        // Usuário sem permissão administrativa
        if (resposta.status === 403) {
          router.replace("/");
          return;
        }

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível carregar os psicólogos pendentes."
          );
        }

        const dados: RespostaPendentes =
          await resposta.json();

        if (controller.signal.aborted) return;

        if (
          !dados.success ||
          !Array.isArray(dados.psicologos)
        ) {
          throw new Error(
            "Resposta inválida do servidor."
          );
        }

        setPsicologos(dados.psicologos);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Erro ao consultar os psicólogos."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    void carregarPsicologos();

    return () => {
      controller.abort();
    };
  }, [router]);

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-teal-800">
            SEREN
            <span className="text-teal-600">
              VIA
            </span>
          </p>

          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" />

          <p
            role="status"
            className="mt-5 text-sm text-slate-600"
          >
            Carregando psicólogos pendentes...
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
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
          <p className="text-xl font-semibold text-teal-800">
            SERENVIA
          </p>

          <h1 className="mt-6 text-xl font-semibold text-red-700">
            Erro ao carregar profissionais
          </h1>

          <p
            role="alert"
            className="mt-3 text-slate-600"
          >
            {erro}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-teal-800 px-5 py-3 font-medium text-white transition hover:bg-teal-900"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
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
            Psicólogos aguardando aprovação
          </h1>

          <p className="mt-4 max-w-3xl leading-7 text-teal-50">
            Consulte os cadastros profissionais
            demonstrativos que aguardam análise
            administrativa simulada.
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white/15 px-5 py-3 text-sm font-semibold">
            {psicologos.length}{" "}
            {psicologos.length === 1
              ? "profissional pendente"
              : "profissionais pendentes"}
          </div>
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
            e os registros de CRP são utilizados
            exclusivamente para simulação.
            Nenhuma verificação oficial do registro
            profissional é realizada.
          </p>
        </section>

        {/* ======================================
            LISTA DE PROFISSIONAIS
        ====================================== */}

        <section className="mt-8 space-y-6">

          {psicologos.length === 0 ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-xl font-semibold">
                Nenhum psicólogo pendente
              </h2>

              <p className="mt-3 text-slate-600">
                Não existem cadastros demonstrativos
                aguardando análise neste momento.
              </p>
            </div>
          ) : (
            psicologos.map((psicologo) => (
              <article
                key={psicologo.id}
                className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9"
              >

                {/* ==================================
                    IDENTIFICAÇÃO
                ================================== */}

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {psicologo.usuario.nome}
                    </h2>

                    <p className="mt-2 break-all text-sm text-slate-600">
                      {psicologo.usuario.email}
                    </p>

                    {!psicologo.usuario.ativo && (
                      <span className="mt-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                        Conta inativa
                      </span>
                    )}
                  </div>

                  <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                    Aguardando análise
                  </span>
                </div>

                {/* ==================================
                    INFORMAÇÕES PROFISSIONAIS
                ================================== */}

                <div className="mt-7 grid gap-6 border-t border-stone-100 pt-7 sm:grid-cols-2 lg:grid-cols-3">

                  {/* CRP */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CRP demonstrativo
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {psicologo.crpUf} /{" "}
                      {psicologo.crpNumero}
                    </p>
                  </div>

                  {/* ESPECIALIDADE */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Especialidade
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {psicologo.especialidade ||
                        "Não informada"}
                    </p>
                  </div>

                  {/* TELEFONE */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Telefone
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {psicologo.telefone}
                    </p>
                  </div>

                  {/* VALOR */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Valor demonstrativo
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {formatarValor(
                        psicologo.valorConsulta
                      )}
                    </p>
                  </div>

                  {/* DATA */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Data do cadastro
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {formatarData(
                        psicologo.criadoEm
                      )}
                    </p>
                  </div>

                  {/* LOCALIZAÇÃO */}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Localização
                    </p>

                    <p className="mt-2 font-medium text-slate-900">
                      {psicologo.endereco
                        ? `${psicologo.endereco.cidade} - ${psicologo.endereco.uf}`
                        : "Não informada"}
                    </p>
                  </div>
                </div>

                {/* ==================================
                    BIOGRAFIA
                ================================== */}

                {psicologo.biografia && (
                  <div className="mt-7 border-t border-stone-100 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Biografia demonstrativa
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {psicologo.biografia}
                    </p>
                  </div>
                )}

                {/* ==================================
                    INFORMAÇÕES DA ANÁLISE
                ================================== */}

                <div className="mt-7 rounded-2xl border border-teal-100 bg-teal-50 p-5">
                  <h3 className="text-sm font-semibold text-teal-900">
                    Análise administrativa simulada
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-teal-800">
                    Este cadastro está aguardando
                    uma decisão administrativa.
                    O administrador pode visualizar
                    os detalhes, registrar uma justificativa
                    e simular a aprovação ou rejeição
                    do perfil profissional.
                  </p>

                  <p className="mt-2 text-xs leading-6 text-teal-700">
                    A decisão será registrada no
                    histórico de auditoria do sistema.
                    Nenhuma validação oficial do CRP
                    é realizada neste ambiente.
                  </p>
                </div>

                {/* ==================================
                    BOTÃO ANALISAR CADASTRO
                ================================== */}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm text-slate-500">
                    Cadastro aguardando análise demonstrativa.
                  </p>

                  <Link
                    href={`/admin/psicologos/${psicologo.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-900"
                  >
                    Analisar cadastro →
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>

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