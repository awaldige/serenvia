"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ==========================================
// TIPOS
// ==========================================

type StatusPsicologo =
  | "RASCUNHO"
  | "PENDENTE"
  | "APROVADO"
  | "REJEITADO"
  | "SUSPENSO";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: "PACIENTE" | "PSICOLOGO" | "ADMIN";
  statusPsicologo: StatusPsicologo | null;
};

type RespostaSessao = {
  success: boolean;
  usuario?: Usuario;
  message?: string;
};

// ==========================================
// CONFIGURAÇÃO DOS STATUS
// ==========================================

const configuracaoStatus: Record<
  StatusPsicologo,
  {
    titulo: string;
    descricao: string;
    estilo: string;
  }
> = {
  RASCUNHO: {
    titulo: "Cadastro em preparação",
    descricao:
      "Seu perfil demonstrativo ainda precisa ser concluído antes de ser enviado para análise administrativa simulada.",
    estilo: "border-slate-200 bg-slate-50 text-slate-800",
  },

  PENDENTE: {
    titulo: "Aguardando análise demonstrativa",
    descricao:
      "Seu cadastro foi recebido e está aguardando uma decisão administrativa simulada. Nenhuma verificação oficial do registro profissional é realizada.",
    estilo: "border-amber-200 bg-amber-50 text-amber-900",
  },

  APROVADO: {
    titulo: "Cadastro demonstrativo aprovado",
    descricao:
      "Seu perfil foi aprovado no fluxo administrativo simulado do Serenvia. Essa aprovação não representa validação oficial do CRP. Você já pode gerenciar disponibilidades semanais, visualizar agendamentos recebidos e confirmar ou cancelar consultas demonstrativas.",
    estilo: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },

  REJEITADO: {
    titulo: "Cadastro demonstrativo não aprovado",
    descricao:
      "Seu cadastro não foi aprovado na análise administrativa simulada. O status poderá ser reavaliado pelos administradores da demonstração.",
    estilo: "border-red-200 bg-red-50 text-red-800",
  },

  SUSPENSO: {
    titulo: "Cadastro demonstrativo suspenso",
    descricao:
      "Seu perfil foi suspenso no ambiente de demonstração. A situação poderá ser alterada pelos administradores conforme as regras do sistema.",
    estilo: "border-red-200 bg-red-50 text-red-800",
  },
};

// ==========================================
// PAINEL DO PSICÓLOGO
// ==========================================

export default function PainelPsicologoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  const [erro, setErro] = useState("");

  // ==========================================
  // VERIFICAR SESSÃO DO PSICÓLOGO
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function verificarSessao() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!ativo) return;

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível verificar sua sessão."
          );
        }

        const dados: RespostaSessao =
          await resposta.json();

        if (!ativo) return;

        if (!dados.success || !dados.usuario) {
          router.replace("/login");
          return;
        }

        // ======================================
        // VERIFICAR TIPO DE USUÁRIO
        // ======================================

        if (dados.usuario.tipo !== "PSICOLOGO") {
          router.replace(
            dados.usuario.tipo === "PACIENTE"
              ? "/paciente"
              : dados.usuario.tipo === "ADMIN"
                ? "/admin"
                : "/login"
          );

          return;
        }

        setUsuario(dados.usuario);
      } catch {
        if (ativo) {
          setErro(
            "Não foi possível carregar seu painel. Verifique sua conexão e tente novamente."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, [router]);

  // ==========================================
  // SAIR DA CONTA
  // ==========================================

  async function sairDaConta() {
    if (saindo) return;

    setSaindo(true);
    setErro("");

    try {
      const resposta = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!resposta.ok) {
        throw new Error(
          "Não foi possível encerrar sua sessão."
        );
      }

      setUsuario(null);

      router.replace("/login");
      router.refresh();
    } catch {
      setErro(
        "Não foi possível sair da conta. Tente novamente."
      );

      setSaindo(false);
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
        <div className="text-center">
          <p className="text-2xl font-semibold tracking-tight text-teal-800">
            SEREN
            <span className="text-teal-600">VIA</span>
          </p>

          <p
            role="status"
            className="mt-4 text-sm text-slate-600"
          >
            Carregando seu painel profissional...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // SESSÃO NÃO DISPONÍVEL
  // ==========================================

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-2xl font-semibold text-teal-800">
            SERENVIA
          </p>

          <p
            role={erro ? "alert" : "status"}
            className={`mt-5 text-sm leading-6 ${
              erro ? "text-red-700" : "text-slate-600"
            }`}
          >
            {erro || "Redirecionando..."}
          </p>

          {erro && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white transition hover:bg-teal-900"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </main>
    );
  }

  const status = usuario.statusPsicologo;

  const informacoesStatus = status
    ? configuracaoStatus[status]
    : null;

  const primeiroNome =
    usuario.nome.trim().split(/\s+/)[0] || "Profissional";

  const perfilAprovado = status === "APROVADO";

  // ==========================================
  // INTERFACE PRINCIPAL
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

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/psicologo/perfil"
              className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-50"
            >
              Meu perfil
            </Link>

            <button
              type="button"
              onClick={sairDaConta}
              disabled={saindo}
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saindo ? "Saindo..." : "Sair da conta"}
            </button>
          </div>
        </div>
      </header>

      {/* ======================================
          CONTEÚDO PRINCIPAL
      ====================================== */}

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* ======================================
            BOAS-VINDAS
        ====================================== */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-8 py-10 text-white sm:px-12">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Área do psicólogo
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Olá, {primeiroNome}!
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-teal-50">
            Bem-vindo ao seu espaço profissional no Serenvia.
            Aqui você pode acompanhar a situação do seu
            cadastro demonstrativo, consultar seus dados
            e gerenciar os recursos disponíveis na plataforma.
          </p>

          <p className="mt-4 text-sm font-medium text-teal-100">
            Um caminho para o bem-estar emocional.
          </p>

          <Link
            href="/psicologo/perfil"
            className="mt-7 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-900 transition hover:bg-teal-50"
          >
            Visualizar meu perfil
            <span
              className="ml-2"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </section>

        {/* ======================================
            AVISO DEMONSTRATIVO
        ====================================== */}

        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="text-base font-semibold text-violet-900">
            Ambiente demonstrativo
          </h2>

          <p className="mt-2 text-sm leading-7 text-violet-800">
            O Serenvia é um projeto de portfólio
            desenvolvido pela AW TECHNOLOGY.
            Todos os perfis profissionais e pacientes são fictícios.
            A aprovação administrativa é simulada,
            não existe validação oficial do CRP e
            não são realizados atendimentos psicológicos reais.
          </p>
        </section>

        {/* ======================================
            STATUS DO CADASTRO
        ====================================== */}

        <section
          className={`mt-8 rounded-3xl border p-7 sm:p-9 ${
            informacoesStatus?.estilo ||
            "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <p className="text-sm font-semibold uppercase tracking-wide">
            Situação cadastral demonstrativa
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            {informacoesStatus?.titulo ||
              "Situação cadastral indisponível"}
          </h2>

          <p className="mt-4 max-w-3xl leading-7">
            {informacoesStatus?.descricao ||
              "Não foi possível identificar o status do seu perfil demonstrativo."}
          </p>
        </section>

        {/* ======================================
            DADOS DA CONTA
        ====================================== */}

        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Informações da conta
            </h2>

            <Link
              href="/psicologo/perfil"
              className="text-sm font-semibold text-teal-700 transition hover:text-teal-900 hover:underline"
            >
              Ver perfil completo →
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Nome
              </p>

              <p className="mt-1 font-medium">
                {usuario.nome}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                E-mail
              </p>

              <p className="mt-1 break-all font-medium">
                {usuario.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Tipo de conta
              </p>

              <p className="mt-1 font-medium">
                Psicólogo demonstrativo
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Status
              </p>

              <p className="mt-1 font-medium">
                {status || "Não disponível"}
              </p>
            </div>
          </div>
        </section>

        {/* ======================================
            ESPAÇO PROFISSIONAL
        ====================================== */}

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            Seu espaço profissional
          </h2>

          <p className="mt-2 text-slate-600">
            Gerencie suas informações demonstrativas,
            organize disponibilidades e acompanhe
            agendamentos simulados.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {/* ==================================
                MINHA AGENDA
            ================================== */}

            {perfilAprovado ? (
              <Link
                href="/psicologo/agenda"
                className="group flex flex-col rounded-2xl border border-teal-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-md"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 text-3xl"
                >
                  📅
                </div>

                <h3 className="text-lg font-semibold transition group-hover:text-teal-800">
                  Minha agenda
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Organize seus dias e horários de
                  disponibilidade para consultas demonstrativas.
                  Cadastre, visualize e remova horários semanais.
                </p>

                <div className="mt-auto pt-5">
                  <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                    Disponível
                  </span>

                  <p className="mt-4 text-sm font-semibold text-teal-700 group-hover:underline">
                    Acessar minha agenda →
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div
                  aria-hidden="true"
                  className="mb-4 text-3xl"
                >
                  📅
                </div>

                <h3 className="text-lg font-semibold">
                  Minha agenda
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  O gerenciamento de horários demonstrativos
                  estará disponível quando seu perfil estiver
                  aprovado no fluxo administrativo simulado.
                </p>

                <div className="mt-auto pt-5">
                  <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Aguardando aprovação
                  </span>
                </div>
              </div>
            )}

            {/* ==================================
                MINHAS CONSULTAS
            ================================== */}

            {perfilAprovado ? (
              <Link
                href="/psicologo/consultas"
                className="group flex flex-col rounded-2xl border border-teal-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-md"
              >
                <div
                  aria-hidden="true"
                  className="mb-4 text-3xl"
                >
                  👥
                </div>

                <h3 className="text-lg font-semibold transition group-hover:text-teal-800">
                  Minhas consultas
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Visualize solicitações de agendamento,
                  acompanhe os dados dos pacientes fictícios
                  e confirme ou cancele consultas demonstrativas.
                </p>

                <div className="mt-auto pt-5">
                  <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                    Disponível
                  </span>

                  <p className="mt-4 text-sm font-semibold text-teal-700 group-hover:underline">
                    Gerenciar minhas consultas →
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div
                  aria-hidden="true"
                  className="mb-4 text-3xl"
                >
                  👥
                </div>

                <h3 className="text-lg font-semibold">
                  Minhas consultas
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  A visualização e o gerenciamento de
                  agendamentos demonstrativos estarão
                  disponíveis após a aprovação simulada
                  do seu perfil profissional.
                </p>

                <div className="mt-auto pt-5">
                  <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Aguardando aprovação
                  </span>
                </div>
              </div>
            )}

            {/* ==================================
                MEU PERFIL
            ================================== */}

            <Link
              href="/psicologo/perfil"
              className="group flex flex-col rounded-2xl border border-teal-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-teal-500 hover:shadow-md"
            >
              <div
                aria-hidden="true"
                className="mb-4 text-3xl"
              >
                ⚙️
              </div>

              <h3 className="text-lg font-semibold transition group-hover:text-teal-800">
                Meu perfil
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Visualize seus dados pessoais,
                informações profissionais fictícias,
                especialidade, valor demonstrativo
                da consulta e endereço.
              </p>

              <div className="mt-auto pt-5">
                <span className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                  Disponível
                </span>

                <p className="mt-4 text-sm font-semibold text-teal-700 group-hover:underline">
                  Acessar meu perfil →
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* ======================================
            MENSAGENS DE ERRO
        ====================================== */}

        {erro && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {erro}
          </div>
        )}

        {/* ======================================
            RODAPÉ SERENVIA
        ====================================== */}

        <footer className="mt-14 border-t border-stone-200 pt-8 text-center">
          <p className="text-sm font-semibold text-teal-800">
            SERENVIA
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 Serenvia.
            Projeto demonstrativo desenvolvido
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