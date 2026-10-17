"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | string>("");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">
      {/* CABEÇALHO */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            SEREN<span className="text-teal-600">VIA</span>
          </Link>

          <nav className="flex items-center gap-5 text-sm">
            <a
              href="#como-funciona"
              className="hidden text-slate-600 transition hover:text-slate-900 sm:block"
            >
              Como funciona
            </a>

            <Link
              href="/login"
              className="font-medium text-slate-700 transition hover:text-slate-900"
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

      {/* APRESENTAÇÃO PRINCIPAL */}

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <span className="inline-block rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-900">
            Plataforma demonstrativa de psicologia
          </span>

          <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seu bem-estar começa com um novo caminho.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            Conheça o Serenvia, uma plataforma desenvolvida para
            demonstrar como a tecnologia pode aproximar pessoas
            e profissionais de psicologia, tornando a experiência
            de busca e organização de consultas mais simples.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/psicologos"
              className="rounded-full bg-teal-800 px-6 py-3.5 font-medium text-white transition hover:bg-teal-900"
            >
              Encontrar psicólogos
            </Link>

            <a
              href="#como-funciona"
              className="rounded-full border border-stone-300 bg-white px-6 py-3.5 font-medium text-slate-700 transition hover:bg-stone-100"
            >
              Conhecer a plataforma
            </a>
          </div>

          <div className="mt-7 rounded-2xl border border-teal-100 bg-white p-4">
            <p className="text-sm leading-6 text-slate-600">
              <strong className="text-teal-800">
                Ambiente demonstrativo:
              </strong>{" "}
              os profissionais apresentados são fictícios.
              Nenhum registro profissional foi validado oficialmente.
              Não são realizados atendimentos psicológicos reais.
            </p>
          </div>
        </div>

        {/* CARTÃO DE APRESENTAÇÃO */}

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
          </div>

          <h2 className="mt-6 text-2xl font-semibold">
            Serenvia: um caminho para o bem-estar emocional
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            Uma experiência digital criada para demonstrar
            a apresentação de profissionais, a consulta de
            horários e a organização de agendamentos.
          </p>

          <div className="mt-8 space-y-4">
            {[
              "Explore perfis profissionais fictícios",
              "Conheça especialidades e valores demonstrativos",
              "Descubra como funcionará o agendamento simulado",
            ].map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800">
                  {index + 1}
                </span>

                <span className="text-sm text-slate-700">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-teal-50 p-5">
            <p className="text-sm font-semibold text-teal-900">
              Tecnologia com propósito
            </p>

            <p className="mt-2 text-sm leading-6 text-teal-800">
              O Serenvia é um projeto de portfólio desenvolvido
              pela AW TECHNOLOGY, com foco em experiência
              do usuário, organização e segurança.
            </p>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}

      <section
        id="como-funciona"
        className="border-t border-stone-200 bg-white px-6 py-16"
      >
        <div className="mx-auto max-w-6xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-teal-700">
            Conheça o Serenvia
          </span>

          <h2 className="mt-4 text-3xl font-semibold">
            Mais clareza em cada etapa
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-600">
            Do primeiro acesso à simulação de agendamento,
            o Serenvia foi desenvolvido para demonstrar
            uma experiência digital acessível, organizada
            e com atenção à privacidade.
          </p>

          <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
            {[
              {
                numero: "01",
                titulo: "Explore profissionais",
                descricao:
                  "Conheça perfis fictícios, especialidades e apresentações profissionais.",
              },
              {
                numero: "02",
                titulo: "Conheça os detalhes",
                descricao:
                  "Visualize informações demonstrativas para compreender como funciona a plataforma.",
              },
              {
                numero: "03",
                titulo: "Simule um agendamento",
                descricao:
                  "Em uma próxima etapa, será possível explorar um fluxo demonstrativo de agendamento.",
              },
            ].map((etapa) => (
              <div
                key={etapa.numero}
                className="rounded-3xl border border-stone-200 bg-[#f8f7f4] p-7"
              >
                <span className="text-sm font-bold text-teal-700">
                  {etapa.numero}
                </span>

                <h3 className="mt-4 text-xl font-semibold">
                  {etapa.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {etapa.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RODAPÉ */}

      <footer className="border-t border-stone-200 bg-[#f8f7f4] px-6 py-8 text-center text-sm text-slate-500">
        <p className="font-semibold text-teal-800">
          SERENVIA
        </p>

        <p className="mt-2">
          Um caminho para o bem-estar emocional.
        </p>

        <p className="mt-4">
          © {currentYear || "2026"} Serenvia.
          Projeto demonstrativo desenvolvido por AW TECHNOLOGY.
        </p>

        <p className="mt-2 text-xs">
          Profissionais fictícios. Sem atendimento psicológico real.
        </p>
      </footer>
    </main>
  );
}