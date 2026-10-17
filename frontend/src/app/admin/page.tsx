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

type Administrador = {
  id: string;
  nome: string;
  email: string;
  tipo: "ADMIN";
};

type RespostaAdministrador = {
  success: boolean;
  usuario?: Administrador;
  message?: string;
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AdminPage() {
  const router = useRouter();

  const [administrador, setAdministrador] =
    useState<Administrador | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // ==========================================
  // VERIFICAR AUTENTICAÇÃO ADMINISTRATIVA
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function verificarAdministrador() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/admin/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        // Sessão expirada ou não autenticada
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
            "Não foi possível verificar o acesso administrativo."
          );
        }

        const dados: RespostaAdministrador =
          await resposta.json();

        if (controller.signal.aborted) return;

        if (
          !dados.success ||
          !dados.usuario ||
          dados.usuario.tipo !== "ADMIN"
        ) {
          router.replace("/login");
          return;
        }

        setAdministrador(dados.usuario);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível conectar ao servidor."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    void verificarAdministrador();

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
            <span className="text-teal-600">VIA</span>
          </p>

          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" />

          <p
            role="status"
            className="mt-5 text-sm font-medium text-slate-600"
          >
            Verificando acesso administrativo...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERRO DE CONEXÃO
  // ==========================================

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] p-6">
        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
          <p className="text-xl font-semibold text-teal-800">
            SERENVIA
          </p>

          <h1 className="mt-6 text-xl font-bold text-red-700">
            Erro ao verificar acesso
          </h1>

          <p
            role="alert"
            className="mt-3 text-sm leading-6 text-slate-600"
          >
            {erro}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900"
          >
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // PROTEÇÃO DA INTERFACE
  // ==========================================

  if (!administrador) {
    return null;
  }

  // ==========================================
  // PAINEL ADMINISTRATIVO
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
              href="/"
              className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-50"
            >
              Página inicial
            </Link>

            <span className="rounded-full bg-teal-100 px-4 py-2 text-xs font-semibold text-teal-900">
              Administração
            </span>
          </div>
        </div>
      </header>

      {/* ======================================
          CONTEÚDO PRINCIPAL
      ====================================== */}

      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* ======================================
            APRESENTAÇÃO
        ====================================== */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-8 py-10 text-white sm:px-12">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Gestão administrativa
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Painel Administrativo
          </h1>

          <p className="mt-5 text-lg text-teal-50">
            Bem-vindo,{" "}
            <span className="font-semibold text-white">
              {administrador.nome}
            </span>
            !
          </p>

          <p className="mt-2 break-all text-sm text-teal-100">
            {administrador.email}
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white">
            Acesso administrativo autorizado
          </div>

          <p className="mt-6 max-w-3xl leading-7 text-teal-50">
            Gerencie os cadastros profissionais
            demonstrativos, acompanhe as decisões
            administrativas simuladas e consulte
            o histórico de auditoria da plataforma.
          </p>
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
            Os perfis profissionais são fictícios,
            a aprovação administrativa é simulada
            e nenhum registro profissional é
            validado oficialmente junto ao CRP.
            Não são realizados atendimentos psicológicos reais.
          </p>
        </section>

        {/* ======================================
            TÍTULO DOS RECURSOS
        ====================================== */}

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">
            Gestão da plataforma
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Selecione uma funcionalidade administrativa
            para continuar.
          </p>

          {/* ======================================
              CARDS ADMINISTRATIVOS
          ====================================== */}

          <div className="mt-6 grid gap-6 md:grid-cols-3">

            {/* CARD 1 — PSICÓLOGOS */}

            <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:border-teal-200 hover:shadow-md">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl"
              >
                👥
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Psicólogos
              </h3>

              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                Consulte os perfis profissionais
                fictícios cadastrados, pesquise
                por nome, e-mail ou CRP demonstrativo
                e acompanhe os diferentes status
                de cadastro.
              </p>

              <Link
                href="/admin/psicologos"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-900"
              >
                Gerenciar psicólogos →
              </Link>
            </article>

            {/* CARD 2 — APROVAÇÕES PENDENTES */}

            <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:border-teal-200 hover:shadow-md">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl"
              >
                📋
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Aprovações pendentes
              </h3>

              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                Analise os cadastros demonstrativos,
                registre as justificativas das decisões
                e simule a aprovação ou rejeição
                dos perfis profissionais.
              </p>

              <Link
                href="/admin/psicologos/pendentes"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-900"
              >
                Ver psicólogos pendentes →
              </Link>
            </article>

            {/* CARD 3 — AUDITORIA */}

            <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:border-teal-200 hover:shadow-md">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-2xl"
              >
                🛡️
              </div>

              <h3 className="mt-5 text-xl font-semibold">
                Segurança e auditoria
              </h3>

              <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                Consulte o histórico de decisões
                administrativas, identifique os
                responsáveis pelas alterações
                e visualize as justificativas
                registradas no sistema.
              </p>

              <Link
                href="/admin/auditoria"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-900"
              >
                Consultar auditoria →
              </Link>
            </article>
          </div>
        </section>

        {/* ======================================
            INFORMAÇÕES ADMINISTRATIVAS
        ====================================== */}

        <section className="mt-10 rounded-3xl border border-teal-100 bg-teal-50 p-7 sm:p-9">
          <h2 className="text-xl font-semibold text-teal-900">
            Fluxo de análise profissional
          </h2>

          <p className="mt-4 text-sm leading-7 text-teal-800">
            Os cadastros profissionais passam
            por um fluxo administrativo demonstrativo
            antes de serem disponibilizados no
            catálogo público da plataforma.
          </p>

          <p className="mt-3 text-sm leading-7 text-teal-800">
            No modo de demonstração, as decisões
            de aprovação, rejeição, suspensão
            e reativação são simuladas.
            Não há conferência oficial do registro
            profissional no Conselho Regional
            de Psicologia.
          </p>

          <p className="mt-3 text-sm leading-7 text-teal-800">
            As decisões administrativas são
            registradas no histórico de auditoria,
            incluindo os status envolvidos,
            a justificativa, a data e o
            administrador responsável.
          </p>
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
            © {new Date().getFullYear()} Serenvia.
            Projeto demonstrativo desenvolvido
            por AW TECHNOLOGY.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Gestão simulada • Perfis fictícios •
            Sem atendimento psicológico real
          </p>
        </footer>
      </div>
    </main>
  );
}