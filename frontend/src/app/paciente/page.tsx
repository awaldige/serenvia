"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const API_URL = "";

// ==========================================
// TIPOS
// ==========================================

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: "PACIENTE" | "PSICOLOGO" | "ADMIN";
};

type RespostaSessao = {
  success: boolean;
  usuario?: Usuario;
};

// ==========================================
// PAINEL DO PACIENTE
// ==========================================

export default function PainelPacientePage() {
  const router = useRouter();

  // ==========================================
  // ESTADOS
  // ==========================================

  const [usuario, setUsuario] = useState<Usuario | null>(
    null
  );

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState("");

  const [saindo, setSaindo] = useState(false);

  const [erroLogout, setErroLogout] = useState("");

  // ==========================================
  // VERIFICAR SESSÃO
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

        if (resposta.status === 401) {
          if (ativo) {
            router.replace("/login");
          }

          return;
        }

        if (!resposta.ok) {
          throw new Error(
            "Erro ao verificar sessão."
          );
        }

        const dados: RespostaSessao =
          await resposta.json();

        if (
          !dados.success ||
          !dados.usuario ||
          dados.usuario.tipo !== "PACIENTE"
        ) {
          if (ativo) {
            router.replace("/login");
          }

          return;
        }

        if (ativo) {
          setUsuario(dados.usuario);
        }
      } catch {
        if (ativo) {
          setErro(
            "Não foi possível verificar sua sessão. Tente novamente."
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
  // ENCERRAR SESSÃO
  // ==========================================

  async function sairDaConta() {
    if (saindo) return;

    setSaindo(true);
    setErroLogout("");

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
          "Não foi possível encerrar a sessão."
        );
      }

      setUsuario(null);

      router.replace("/login");
      router.refresh();
    } catch {
      setErroLogout(
        "Não foi possível sair da conta. Tente novamente."
      );
    } finally {
      setSaindo(false);
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4]">
        <div className="text-center">
          <p className="text-2xl font-semibold text-teal-800">
            SERENVIA
          </p>

          <p
            role="status"
            className="mt-4 text-slate-600"
          >
            Verificando sua sessão...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERRO DE SESSÃO
  // ==========================================

  if (erro) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f8f7f4] px-6">
        <p className="text-2xl font-semibold text-teal-800">
          SERENVIA
        </p>

        <p
          role="alert"
          className="text-center text-red-700"
        >
          {erro}
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-teal-800 px-6 py-3 text-white transition hover:bg-teal-900"
        >
          Voltar ao login
        </Link>
      </main>
    );
  }

  if (!usuario) return null;

  const primeiroNome =
    usuario.nome.trim().split(/\s+/)[0] || "Paciente";

  // ==========================================
  // INTERFACE
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">

      {/* ======================================
          CABEÇALHO
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

          <div className="flex flex-wrap items-center gap-4">

            <span className="hidden text-sm text-slate-600 sm:inline">
              {usuario.nome}
            </span>

            <Link
              href="/"
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-50"
            >
              Página inicial
            </Link>

            <button
              type="button"
              onClick={sairDaConta}
              disabled={saindo}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saindo
                ? "Saindo..."
                : "Sair da conta"}
            </button>

          </div>
        </div>
      </header>

      {/* ======================================
          ERRO DE LOGOUT
      ====================================== */}

      {erroLogout && (
        <div
          role="alert"
          className="mx-auto mt-4 max-w-6xl rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700"
        >
          {erroLogout}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* ======================================
            BOAS-VINDAS
        ====================================== */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-8 py-10 text-white sm:px-12">

          <span className="inline-block rounded-full bg-white/15 px-4 py-2 text-sm">
            SERENVIA • Área do paciente
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Olá, {primeiroNome}!
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-teal-50">
            Bem-vindo ao seu espaço no SERENVIA.
            Explore profissionais fictícios,
            agende consultas demonstrativas
            e acompanhe suas solicitações
            diretamente pela plataforma.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">

            <Link
              href="/paciente/agendar"
              className="inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-teal-900 transition hover:bg-teal-50"
            >
              Agendar consulta
            </Link>

            <Link
              href="/paciente/consultas"
              className="inline-flex rounded-xl border border-white/50 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              Minhas consultas
            </Link>

          </div>
        </section>

        {/* ======================================
            AVISO DEMONSTRATIVO
        ====================================== */}

        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">

          <h2 className="font-semibold text-violet-900">
            Ambiente demonstrativo
          </h2>

          <p className="mt-2 text-sm leading-7 text-violet-800">
            O SERENVIA é um projeto de portfólio
            desenvolvido pela AW TECHNOLOGY.
            Todos os profissionais e pacientes utilizados
            nos testes são fictícios. Os agendamentos
            são simulados e não representam atendimentos
            psicológicos reais.
          </p>

        </section>

        {/* ======================================
            CARDS DE ACESSO RÁPIDO
        ====================================== */}

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {/* AGENDAR CONSULTA */}

          <div className="rounded-2xl border border-teal-200 bg-white p-7 shadow-sm transition hover:shadow-md">

            <div
              aria-hidden="true"
              className="mb-5 text-3xl"
            >
              📅
            </div>

            <h2 className="text-xl font-semibold">
              Agendar consulta
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulte horários disponíveis e realize
              agendamentos fictícios pela plataforma.
            </p>

            <Link
              href="/paciente/agendar"
              className="mt-5 inline-block text-sm font-semibold text-teal-800 hover:underline"
            >
              Consultar horários →
            </Link>

          </div>

          {/* MINHAS CONSULTAS */}

          <div className="rounded-2xl border border-emerald-200 bg-white p-7 shadow-sm transition hover:shadow-md">

            <div
              aria-hidden="true"
              className="mb-5 text-3xl"
            >
              🗓️
            </div>

            <h2 className="text-xl font-semibold">
              Minhas consultas
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Acompanhe seus agendamentos demonstrativos,
              consulte datas, horários e status.
            </p>

            <Link
              href="/paciente/consultas"
              className="mt-5 inline-block text-sm font-semibold text-teal-800 hover:underline"
            >
              Visualizar consultas →
            </Link>

          </div>

          {/* ENCONTRAR PSICÓLOGOS */}

          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:shadow-md">

            <div
              aria-hidden="true"
              className="mb-5 text-3xl"
            >
              🧠
            </div>

            <h2 className="text-xl font-semibold">
              Encontrar psicólogos
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Explore os perfis fictícios
              dos profissionais disponíveis
              no catálogo demonstrativo.
            </p>

            <Link
              href="/psicologos"
              className="mt-5 inline-block text-sm font-semibold text-teal-800 hover:underline"
            >
              Explorar profissionais →
            </Link>

          </div>

          {/* MINHA CONTA */}

          <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:shadow-md">

            <div
              aria-hidden="true"
              className="mb-5 text-3xl"
            >
              👤
            </div>

            <h2 className="text-xl font-semibold">
              Minha conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Consulte as informações básicas
              da sua conta demonstrativa.
            </p>

            <a
              href="#dados-conta"
              className="mt-5 inline-block text-sm font-semibold text-teal-800 hover:underline"
            >
              Visualizar meus dados →
            </a>

          </div>

        </section>

        {/* ======================================
            MINHAS CONSULTAS
        ====================================== */}

        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <h2 className="text-2xl font-semibold">
                Minhas consultas
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Seus agendamentos demonstrativos
                já podem ser consultados.
                Acompanhe as datas, os horários
                e a situação de cada solicitação.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800">
              Disponível
            </span>

          </div>

          <div className="mt-8 rounded-2xl border border-teal-100 bg-teal-50 px-6 py-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-lg font-semibold text-teal-950">
                  Acompanhe suas consultas em um só lugar
                </p>

                <p className="mt-2 max-w-xl text-sm leading-6 text-teal-800">
                  Visualize agendamentos pendentes,
                  confirmados, cancelados e concluídos
                  no ambiente demonstrativo do SERENVIA.
                </p>
              </div>

              <Link
                href="/paciente/consultas"
                className="inline-flex shrink-0 justify-center rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-900"
              >
                Ver minhas consultas →
              </Link>

            </div>
          </div>

        </section>

        {/* ======================================
            DADOS DA CONTA
        ====================================== */}

        <section
          id="dados-conta"
          className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm"
        >

          <h2 className="text-2xl font-semibold">
            Dados da minha conta
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Informações utilizadas para identificação
            da sua conta demonstrativa.
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">

            <div>
              <p className="text-sm text-slate-500">
                Nome completo
              </p>

              <p className="mt-2 font-medium">
                {usuario.nome}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                E-mail
              </p>

              <p className="mt-2 break-all font-medium">
                {usuario.email}
              </p>
            </div>

          </div>
        </section>

        {/* ======================================
            RODAPÉ
        ====================================== */}

        <footer className="mt-12 border-t border-stone-200 pt-8 text-center text-sm text-slate-500">

          <p className="font-semibold text-teal-800">
            SERENVIA
          </p>

          <p className="mt-2">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs">
            © {new Date().getFullYear()} Serenvia.
            Projeto demonstrativo desenvolvido por
            AW TECHNOLOGY.
          </p>

          <p className="mt-2 text-xs">
            Sem atendimento psicológico real.
          </p>

        </footer>

      </div>
    </main>
  );
}