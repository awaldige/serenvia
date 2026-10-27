"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: "PACIENTE" | "PSICOLOGO" | "ADMIN";
  statusPsicologo: StatusPsicologo | null;
};

type Disponibilidade = {
  id: string;
  perfilPsicologoId: string;
  diaSemana: number;
  inicioMinutos: number;
  fimMinutos: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

type RespostaAPI = {
  success: boolean;
  message?: string;
  usuario?: Usuario;
  disponibilidades?: Disponibilidade[];
};

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function horarioParaMinutos(horario: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(horario)) {
    return null;
  }

  const [horas, minutos] = horario.split(":").map(Number);

  if (
    !Number.isInteger(horas) ||
    !Number.isInteger(minutos) ||
    horas < 0 ||
    horas > 23 ||
    minutos < 0 ||
    minutos > 59
  ) {
    return null;
  }

  return horas * 60 + minutos;
}

function minutosParaHorario(total: number): string {
  const horas = Math.floor(total / 60);
  const minutos = total % 60;

  return `${String(horas).padStart(2, "0")}:${String(
    minutos
  ).padStart(2, "0")}`;
}

// ==========================================
// PÁGINA MINHA AGENDA
// ==========================================

export default function AgendaPsicologoPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const [disponibilidades, setDisponibilidades] = useState<
    Disponibilidade[]
  >([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(
    null
  );

  const [diaSemana, setDiaSemana] = useState("1");
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("12:00");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ==========================================
  // CONSULTAR DISPONIBILIDADES
  // ==========================================

  const carregarDisponibilidades = useCallback(async () => {
    const resposta = await fetch(
      `${API_URL}/api/agenda/disponibilidades`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const dados: RespostaAPI = await resposta.json();

    if (!resposta.ok || !dados.success) {
      throw new Error(
        dados.message ||
          "Não foi possível carregar sua agenda."
      );
    }

    setDisponibilidades(dados.disponibilidades || []);
  }, []);

  // ==========================================
  // VERIFICAR SESSÃO E CARREGAR AGENDA
  // ==========================================

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
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

        const dados: RespostaAPI = await resposta.json();

        if (!resposta.ok || !dados.success || !dados.usuario) {
          throw new Error(
            dados.message ||
              "Não foi possível verificar sua sessão."
          );
        }

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

        if (dados.usuario.statusPsicologo !== "APROVADO") {
          router.replace("/psicologo");
          return;
        }

        setUsuario(dados.usuario);

        await carregarDisponibilidades();
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar sua agenda."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void iniciar();

    return () => {
      ativo = false;
    };
  }, [router, carregarDisponibilidades]);

  // ==========================================
  // CADASTRAR DISPONIBILIDADE
  // ==========================================

  async function cadastrarDisponibilidade(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (salvando) return;

    setErro("");
    setSucesso("");

    const inicioMinutos = horarioParaMinutos(inicio);
    const fimMinutos = horarioParaMinutos(fim);

    if (
      inicioMinutos === null ||
      fimMinutos === null ||
      inicioMinutos >= fimMinutos
    ) {
      setErro(
        "Informe um intervalo válido. O horário final deve ser posterior ao inicial."
      );
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/api/agenda/disponibilidades`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            diaSemana: Number(diaSemana),
            inicioMinutos,
            fimMinutos,
          }),
        }
      );

      const dados: RespostaAPI = await resposta.json();

      if (!resposta.ok || !dados.success) {
        throw new Error(
          dados.message ||
            "Não foi possível cadastrar o horário."
        );
      }

      await carregarDisponibilidades();

      setSucesso("Disponibilidade cadastrada com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar disponibilidade."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ==========================================
  // REMOVER DISPONIBILIDADE
  // ==========================================

  async function removerDisponibilidade(id: string) {
    if (removendoId) return;

    const confirmado = window.confirm(
      "Deseja realmente remover esta disponibilidade semanal?"
    );

    if (!confirmado) return;

    setErro("");
    setSucesso("");
    setRemovendoId(id);

    try {
      const resposta = await fetch(
        `${API_URL}/api/agenda/disponibilidades/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const dados: RespostaAPI = await resposta.json();

      if (!resposta.ok || !dados.success) {
        throw new Error(
          dados.message ||
            "Não foi possível remover o horário."
        );
      }

      await carregarDisponibilidades();

      setSucesso("Disponibilidade removida com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao remover disponibilidade."
      );
    } finally {
      setRemovendoId(null);
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4]">
        <p role="status" className="text-teal-800">
          Carregando sua agenda...
        </p>
      </main>
    );
  }

  // ==========================================
  // SESSÃO INDISPONÍVEL
  // ==========================================

  if (!usuario) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-teal-800">
            SERENVIA
          </h1>

          <p role="alert" className="mt-4 text-slate-600">
            {erro || "Redirecionando..."}
          </p>

          <Link
            href="/psicologo"
            className="mt-6 inline-block rounded-xl bg-teal-800 px-5 py-3 text-white"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">
      {/* CABEÇALHO */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            SEREN<span className="text-teal-600">VIA</span>
          </Link>

          <Link
            href="/psicologo"
            className="rounded-xl border border-teal-700 px-5 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* APRESENTAÇÃO */}

        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-8 py-10 text-white sm:px-12">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Área profissional
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Minha agenda
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-teal-50">
            Olá, {usuario.nome.split(" ")[0]}! Organize seus dias
            e horários disponíveis para consultas demonstrativas.
          </p>

          <p className="mt-3 text-sm text-teal-100">
            Os horários são fictícios e não representam
            atendimentos psicológicos reais.
          </p>
        </section>

        {/* AVISO */}

        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="font-semibold text-violet-900">
            Ambiente demonstrativo
          </h2>

          <p className="mt-2 text-sm leading-7 text-violet-800">
            Este módulo faz parte de um projeto de portfólio
            desenvolvido pela AW TECHNOLOGY. Nenhum atendimento
            real será realizado e não devem ser inseridos dados
            sensíveis de pacientes.
          </p>
        </section>

        {/* MENSAGENS */}

        {erro && (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {sucesso}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          {/* FORMULÁRIO */}

          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm lg:col-span-2">
            <h2 className="text-xl font-semibold">
              Adicionar disponibilidade
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Defina os dias e horários em que deseja aparecer
              como disponível na agenda demonstrativa.
            </p>

            <form
              onSubmit={cadastrarDisponibilidade}
              className="mt-7 space-y-5"
            >
              <div>
                <label
                  htmlFor="diaSemana"
                  className="mb-2 block text-sm font-medium"
                >
                  Dia da semana
                </label>

                <select
                  id="diaSemana"
                  value={diaSemana}
                  onChange={(evento) =>
                    setDiaSemana(evento.target.value)
                  }
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-teal-700"
                >
                  {DIAS_SEMANA.map((dia, indice) => (
                    <option key={dia} value={indice}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inicio"
                  className="mb-2 block text-sm font-medium"
                >
                  Horário inicial
                </label>

                <input
                  id="inicio"
                  type="time"
                  required
                  value={inicio}
                  onChange={(evento) =>
                    setInicio(evento.target.value)
                  }
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label
                  htmlFor="fim"
                  className="mb-2 block text-sm font-medium"
                >
                  Horário final
                </label>

                <input
                  id="fim"
                  type="time"
                  required
                  value={fim}
                  onChange={(evento) =>
                    setFim(evento.target.value)
                  }
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-teal-700"
                />
              </div>

              <button
                type="submit"
                disabled={salvando || Boolean(removendoId)}
                className="w-full rounded-xl bg-teal-800 px-5 py-3 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando
                  ? "Salvando horário..."
                  : "Adicionar horário"}
              </button>
            </form>
          </section>

          {/* LISTAGEM */}

          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Disponibilidades cadastradas
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Seus horários semanais demonstrativos.
                </p>
              </div>

              <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
                {disponibilidades.length} horário(s)
              </span>
            </div>

            {disponibilidades.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
                <p className="text-3xl" aria-hidden="true">
                  📅
                </p>

                <p className="mt-4 font-semibold">
                  Nenhum horário cadastrado
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Utilize o formulário para adicionar sua primeira
                  disponibilidade semanal.
                </p>
              </div>
            ) : (
              <div className="mt-7 space-y-4">
                {disponibilidades.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 p-5"
                  >
                    <div>
                      <p className="font-semibold text-teal-900">
                        {DIAS_SEMANA[item.diaSemana] ||
                          "Dia inválido"}
                      </p>

                      <p className="mt-2 text-sm text-slate-600">
                        {minutosParaHorario(item.inicioMinutos)}
                        {" às "}
                        {minutosParaHorario(item.fimMinutos)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void removerDisponibilidade(item.id)
                      }
                      disabled={Boolean(removendoId) || salvando}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removendoId === item.id
                        ? "Removendo..."
                        : "Remover"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RODAPÉ */}

        <footer className="mt-14 border-t border-stone-200 pt-8 text-center">
          <p className="text-sm font-semibold text-teal-800">
            SERENVIA
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            © {new Date().getFullYear()} Serenvia.
            Projeto demonstrativo desenvolvido por AW TECHNOLOGY.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Perfis fictícios • Agenda simulada •
            Sem atendimento psicológico real
          </p>
        </footer>
      </div>
    </main>
  );
}