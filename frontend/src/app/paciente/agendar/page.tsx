"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const FUSO_HORARIO = "America/Sao_Paulo";

const PSICOLOGA = {
  id: "b6df713d-3fde-4828-9cc6-a3e335f88821",
  nome: "Mariana Oliveira",
  especialidade: "Atendimento psicológico demonstrativo",
};

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

type Horario = {
  inicio: string;
  fim: string;
};

type RespostaHorarios = {
  success: boolean;
  modoDemonstracao?: boolean;
  perfilPsicologoId?: string;
  data?: string;
  duracaoMinutos?: number;
  intervaloMinutos?: number;
  horarios?: Horario[];
  message?: string;
  error?: string;
};

type Agendamento = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  criadoEm: string;
};

type RespostaAgendamento = {
  success: boolean;
  modoDemonstracao?: boolean;
  message?: string;
  agendamento?: Agendamento;
};

type Confirmacao = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
};

// ==========================================
// FUNÇÕES DE DATA
// ==========================================

function formatarHorario(dataISO: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_HORARIO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dataISO));
}

function formatarData(data: string) {
  if (!data) return "";

  const [ano, mes, dia] = data.split("-").map(Number);

  const dataLocal = new Date(
    Date.UTC(ano, mes - 1, dia, 12, 0, 0)
  );

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dataLocal);
}

function obterDataHoje() {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find(
    (parte) => parte.type === "year"
  )?.value;

  const mes = partes.find(
    (parte) => parte.type === "month"
  )?.value;

  const dia = partes.find(
    (parte) => parte.type === "day"
  )?.value;

  if (!ano || !mes || !dia) {
    return "";
  }

  return `${ano}-${mes}-${dia}`;
}

// ==========================================
// PÁGINA DE AGENDAMENTO
// ==========================================

export default function AgendarConsultaPage() {
  const router = useRouter();

  // ==========================================
  // ESTADOS
  // ==========================================

  const [usuario, setUsuario] = useState<Usuario | null>(
    null
  );

  const [verificandoSessao, setVerificandoSessao] =
    useState(true);

  const [erroSessao, setErroSessao] = useState("");

  const [dataMinima, setDataMinima] = useState("");

  const [dataSelecionada, setDataSelecionada] =
    useState("");

  const [horarios, setHorarios] = useState<Horario[]>([]);

  const [horarioSelecionado, setHorarioSelecionado] =
    useState<string | null>(null);

  const [carregandoHorarios, setCarregandoHorarios] =
    useState(false);

  const [erroHorarios, setErroHorarios] = useState("");

  const [consultaRealizada, setConsultaRealizada] =
    useState(false);

  const [confirmando, setConfirmando] = useState(false);

  const [erroAgendamento, setErroAgendamento] =
    useState("");

  const [confirmacao, setConfirmacao] =
    useState<Confirmacao | null>(null);

  const [atualizacaoHorarios, setAtualizacaoHorarios] =
    useState(0);

  // Impede duas requisições simultâneas mesmo
  // antes da atualização visual do estado.
  const confirmacaoEmAndamento = useRef(false);

  // ==========================================
  // DEFINIR DATA MÍNIMA
  // ==========================================

  useEffect(() => {
    setDataMinima(obterDataHoje());
  }, []);

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
          setErroSessao(
            "Não foi possível verificar sua sessão. Tente novamente."
          );
        }
      } finally {
        if (ativo) {
          setVerificandoSessao(false);
        }
      }
    }

    void verificarSessao();

    return () => {
      ativo = false;
    };
  }, [router]);

  // ==========================================
  // CONSULTAR HORÁRIOS
  // ==========================================

  useEffect(() => {
    if (!usuario || !dataSelecionada) {
      return;
    }

    const controlador = new AbortController();

    async function consultarHorarios() {
      setCarregandoHorarios(true);
      setErroHorarios("");
      setHorarios([]);
      setHorarioSelecionado(null);
      setConsultaRealizada(false);

      try {
        const parametros = new URLSearchParams({
          perfilPsicologoId: PSICOLOGA.id,
          data: dataSelecionada,
        });

        const resposta = await fetch(
          `${API_URL}/api/agenda/horarios?${parametros.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controlador.signal,
          }
        );

        const dados: RespostaHorarios =
          await resposta.json();

        if (!resposta.ok || !dados.success) {
          throw new Error(
            dados.message ||
              dados.error ||
              "Não foi possível consultar os horários."
          );
        }

        if (!controlador.signal.aborted) {
          setHorarios(dados.horarios ?? []);
          setConsultaRealizada(true);
        }
      } catch (error) {
        if (controlador.signal.aborted) {
          return;
        }

        setErroHorarios(
          error instanceof Error
            ? error.message
            : "Erro ao consultar os horários."
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCarregandoHorarios(false);
        }
      }
    }

    void consultarHorarios();

    return () => {
      controlador.abort();
    };
  }, [usuario, dataSelecionada, atualizacaoHorarios]);

  // ==========================================
  // CONFIRMAR AGENDAMENTO
  // ==========================================

  async function confirmarAgendamento() {
    if (
      !usuario ||
      !dataSelecionada ||
      !horarioSelecionado ||
      confirmacaoEmAndamento.current
    ) {
      return;
    }

    const horarioExiste = horarios.some(
      (horario) =>
        horario.inicio === horarioSelecionado
    );

    if (!horarioExiste) {
      setErroAgendamento(
        "O horário selecionado não está mais disponível."
      );
      return;
    }

    const inicioEscolhido = horarioSelecionado;

    confirmacaoEmAndamento.current = true;

    setConfirmando(true);
    setErroAgendamento("");
    setConfirmacao(null);

    try {
      const resposta = await fetch(
        `${API_URL}/api/agenda/agendamentos`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            perfilPsicologoId: PSICOLOGA.id,
            inicio: inicioEscolhido,
          }),
        }
      );

      const dados: RespostaAgendamento =
        await resposta.json();

      if (resposta.status === 401) {
        router.replace("/login");
        return;
      }

      if (resposta.status === 409) {
        setErroAgendamento(
          dados.message ||
            "Esse horário não está mais disponível. Escolha outro."
        );

        setHorarioSelecionado(null);
        setAtualizacaoHorarios((valor) => valor + 1);

        return;
      }

      if (!resposta.ok || !dados.success) {
        throw new Error(
          dados.message ||
            "Não foi possível confirmar o agendamento."
        );
      }

      if (!dados.agendamento?.id) {
        throw new Error(
          "O servidor não retornou os dados do agendamento."
        );
      }

      // O agendamento foi criado no banco.
      // Guardamos os dados para apresentar
      // a confirmação ao paciente.

      setConfirmacao({
        id: dados.agendamento.id,
        inicio: dados.agendamento.inicio,
        fim: dados.agendamento.fim,
        status: dados.agendamento.status,
      });

      setHorarioSelecionado(null);

      // Busca novamente os horários, removendo
      // os que agora estão ocupados.

      setAtualizacaoHorarios((valor) => valor + 1);
    } catch (error) {
      setErroAgendamento(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao realizar o agendamento."
      );
    } finally {
      confirmacaoEmAndamento.current = false;
      setConfirmando(false);
    }
  }

  // ==========================================
  // CARREGAMENTO DA SESSÃO
  // ==========================================

  if (verificandoSessao) {
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

  if (erroSessao) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f8f7f4] px-6">
        <p className="text-2xl font-semibold text-teal-800">
          SERENVIA
        </p>

        <p
          role="alert"
          className="text-center text-red-700"
        >
          {erroSessao}
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-teal-800 px-6 py-3 text-white"
        >
          Voltar ao login
        </Link>
      </main>
    );
  }

  if (!usuario) {
    return null;
  }

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

          <Link
            href="/paciente"
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium transition hover:bg-stone-50"
          >
            ← Voltar ao painel
          </Link>

        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12">

        {/* ======================================
            TÍTULO
        ====================================== */}

        <section>
          <span className="inline-block rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800">
            SERENVIA • Agendamento demonstrativo
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Agendar consulta
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            Escolha uma data e consulte os horários
            disponíveis para uma sessão demonstrativa.
            Nenhum atendimento psicológico real será
            realizado.
          </p>
        </section>

        {/* ======================================
            PROFISSIONAL
        ====================================== */}

        <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">

          <p className="text-sm font-medium text-teal-800">
            Profissional demonstrativa
          </p>

          <div className="mt-5 flex items-center gap-5">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl font-semibold text-teal-800">
              MO
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {PSICOLOGA.nome}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                {PSICOLOGA.especialidade}
              </p>

              <span className="mt-3 inline-block rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                Perfil fictício
              </span>
            </div>

          </div>
        </section>

        {/* ======================================
            CONFIRMAÇÃO DE SUCESSO
        ====================================== */}

        {confirmacao && (
          <section
            role="status"
            aria-live="polite"
            className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-800">
                ✓
              </div>

              <div>
                <h2 className="text-xl font-semibold text-emerald-950">
                  Agendamento solicitado com sucesso!
                </h2>

                <p className="mt-3 leading-7 text-emerald-900">
                  Sua consulta demonstrativa foi registrada
                  no sistema e está aguardando confirmação.
                </p>

                <div className="mt-5 space-y-2 text-sm text-emerald-900">
                  <p>
                    <strong>Profissional:</strong>{" "}
                    {PSICOLOGA.nome}
                  </p>

                  <p>
                    <strong>Data:</strong>{" "}
                    {formatarData(
                      confirmacao.inicio.slice(0, 10)
                    )}
                  </p>

                  <p>
                    <strong>Horário:</strong>{" "}
                    {formatarHorario(
                      confirmacao.inicio
                    )}
                    {" às "}
                    {formatarHorario(
                      confirmacao.fim
                    )}
                  </p>

                  <p>
                    <strong>Status:</strong>{" "}
                    {confirmacao.status === "PENDENTE"
                      ? "Aguardando confirmação"
                      : confirmacao.status}
                  </p>
                </div>

                <p className="mt-5 text-xs text-emerald-800">
                  Identificador demonstrativo:{" "}
                  {confirmacao.id}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ======================================
            SELECIONAR DATA
        ====================================== */}

        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">

          <h2 className="text-xl font-semibold">
            1. Escolha uma data
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Selecione um dia para consultar os horários
            cadastrados na agenda demonstrativa.
          </p>

          <div className="mt-6">

            <label
              htmlFor="data-consulta"
              className="block text-sm font-medium text-slate-700"
            >
              Data da consulta
            </label>

            <input
              id="data-consulta"
              type="date"
              min={dataMinima || undefined}
              value={dataSelecionada}
              disabled={confirmando}
              onChange={(evento) => {
                setDataSelecionada(
                  evento.target.value
                );

                setHorarioSelecionado(null);
                setHorarios([]);
                setConsultaRealizada(false);
                setErroHorarios("");
                setErroAgendamento("");
                setConfirmacao(null);
              }}
              className="mt-2 w-full max-w-sm rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
            />

          </div>

          {dataSelecionada && (
            <p className="mt-4 text-sm font-medium capitalize text-teal-800">
              {formatarData(dataSelecionada)}
            </p>
          )}

        </section>

        {/* ======================================
            HORÁRIOS
        ====================================== */}

        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">

          <h2 className="text-xl font-semibold">
            2. Escolha um horário
          </h2>

          {!dataSelecionada && (
            <p className="mt-5 text-sm text-slate-600">
              Selecione uma data para visualizar os
              horários disponíveis.
            </p>
          )}

          {carregandoHorarios && (
            <p
              role="status"
              className="mt-5 text-sm text-teal-800"
            >
              Consultando horários disponíveis...
            </p>
          )}

          {erroHorarios && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {erroHorarios}
            </div>
          )}

          {consultaRealizada &&
            !carregandoHorarios &&
            horarios.length === 0 && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5">

                <p className="font-medium text-amber-900">
                  Nenhum horário disponível nesta data.
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Escolha outro dia para consultar a
                  disponibilidade da profissional.
                </p>

              </div>
            )}

          {consultaRealizada &&
            !carregandoHorarios &&
            horarios.length > 0 && (
              <div className="mt-6">

                <p className="mb-4 text-sm text-slate-600">
                  Horários disponíveis no fuso de São Paulo:
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">

                  {horarios.map((horario) => {
                    const selecionado =
                      horarioSelecionado === horario.inicio;

                    return (
                      <button
                        key={horario.inicio}
                        type="button"
                        disabled={confirmando}
                        onClick={() => {
                          setHorarioSelecionado(
                            horario.inicio
                          );

                          setErroAgendamento("");
                          setConfirmacao(null);
                        }}
                        aria-pressed={selecionado}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selecionado
                            ? "border-teal-800 bg-teal-800 text-white"
                            : "border-stone-300 bg-white text-slate-700 hover:border-teal-600 hover:bg-teal-50"
                        }`}
                      >
                        {formatarHorario(
                          horario.inicio
                        )}
                      </button>
                    );
                  })}

                </div>
              </div>
            )}

        </section>

        {/* ======================================
            ERRO DO AGENDAMENTO
        ====================================== */}

        {erroAgendamento && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            {erroAgendamento}
          </div>
        )}

        {/* ======================================
            RESUMO
        ====================================== */}

        {horarioSelecionado && (
          <section className="mt-8 rounded-3xl border border-teal-200 bg-teal-50 p-8">

            <h2 className="text-xl font-semibold text-teal-950">
              3. Resumo da consulta
            </h2>

            <div className="mt-5 space-y-3 text-sm text-teal-900">

              <p>
                <strong>Profissional:</strong>{" "}
                {PSICOLOGA.nome}
              </p>

              <p>
                <strong>Data:</strong>{" "}
                {formatarData(
                  dataSelecionada
                )}
              </p>

              <p>
                <strong>Horário:</strong>{" "}
                {formatarHorario(
                  horarioSelecionado
                )}
              </p>

              <p>
                <strong>Duração:</strong>{" "}
                50 minutos
              </p>

              <p>
                <strong>Modalidade:</strong>{" "}
                Consulta fictícia
              </p>

            </div>

            <button
              type="button"
              disabled={
                confirmando ||
                carregandoHorarios
              }
              onClick={() => {
                void confirmarAgendamento();
              }}
              className="mt-7 rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmando
                ? "Confirmando agendamento..."
                : "Confirmar agendamento"}
            </button>

            <p className="mt-3 text-xs text-teal-800">
              Ao confirmar, será criado um agendamento
              fictício com status inicial pendente.
              Nenhum pagamento será realizado.
            </p>

          </section>
        )}

        {/* ======================================
            AVISO DEMONSTRATIVO
        ====================================== */}

        <section className="mt-10 rounded-2xl border border-violet-200 bg-violet-50 p-6">

          <h2 className="font-semibold text-violet-900">
            Ambiente 100% demonstrativo
          </h2>

          <p className="mt-2 text-sm leading-7 text-violet-800">
            O SERENVIA é um projeto fictício
            desenvolvido pela AW TECHNOLOGY para
            demonstração de funcionalidades de sistemas
            web. Não há atendimentos psicológicos,
            pagamentos ou prestação de serviços de saúde.
          </p>

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