"use client";



import {

  useCallback,

  useEffect,

  useState,

} from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";



// ==========================================*

// CONFIGURAÇÕES*

// ==========================================*



const API_URL =

  process.env.NEXT_PUBLIC_API_URL ||

  "http://localhost:4000";



const FUSO_HORARIO = "America/Sao_Paulo";



const PSICOLOGA_DEMO = {

  id: "b6df713d-3fde-4828-9cc6-a3e335f88821",

  nome: "Mariana Oliveira",

};



// ==========================================*

// TIPOS*

// ==========================================*



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



type StatusAgendamento =

  | "PENDENTE"

  | "CONFIRMADO"

  | "CANCELADO"

  | "CONCLUIDO";



type Agendamento = {

  id: string;

  inicio: string;

  fim: string;

  status: StatusAgendamento;

  criadoEm: string;

  perfilPsicologoId: string;

};



type RespostaAgendamentos = {

  success: boolean;

  agendamentos?: Agendamento[];

  message?: string;

};



type HorarioDisponivel = {

  inicio: string;

  fim: string;

};



type RespostaHorarios = {

  success: boolean;

  horarios?: HorarioDisponivel[];

  message?: string;

};



type RespostaOperacao = {

  success: boolean;

  message?: string;

};



// ==========================================*

// FUNÇÕES AUXILIARES*

// ==========================================*



function formatarData(dataISO: string) {

  return new Intl.DateTimeFormat("pt-BR", {

    timeZone: FUSO_HORARIO,

    weekday: "long",

    day: "2-digit",

    month: "long",

    year: "numeric",

  }).format(new Date(dataISO));

}



function formatarHorario(dataISO: string) {

  return new Intl.DateTimeFormat("pt-BR", {

    timeZone: FUSO_HORARIO,

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,

  }).format(new Date(dataISO));

}



function obterNomeProfissional(perfilId: string) {

  if (perfilId === PSICOLOGA_DEMO.id) {

    return PSICOLOGA_DEMO.nome;

  }



  return "Profissional demonstrativo";

}



function obterStatus(status: StatusAgendamento) {

  switch (status) {

    case "PENDENTE":

      return {

        texto: "Aguardando confirmação",

        classe:

          "border-amber-200 bg-amber-50 text-amber-800",

      };



    case "CONFIRMADO":

      return {

        texto: "Confirmada",

        classe:

          "border-emerald-200 bg-emerald-50 text-emerald-800",

      };



    case "CANCELADO":

      return {

        texto: "Cancelada",

        classe:

          "border-red-200 bg-red-50 text-red-800",

      };



    case "CONCLUIDO":

      return {

        texto: "Concluída",

        classe:

          "border-slate-200 bg-slate-100 text-slate-700",

      };

  }

}



function dataLocalHoje() {

  const partes = new Intl.DateTimeFormat("en-CA", {

    timeZone: FUSO_HORARIO,

    year: "numeric",

    month: "2-digit",

    day: "2-digit",

  }).formatToParts(new Date());



  const obter = (tipo: string) =>

    partes.find((parte) => parte.type === tipo)?.value ??

    "";



  return `${obter("year")}-${obter("month")}-${obter("day")}`;

}



// ==========================================*

// CARTÃO DE CONSULTA*

// ==========================================*



function CartaoConsulta({

  agendamento,

  podeAlterar,

  processando,

  aoCancelar,

  aoReagendar,

}: {

  agendamento: Agendamento;

  podeAlterar: boolean;

  processando: boolean;

  aoCancelar: (agendamento: Agendamento) => void;

  aoReagendar: (agendamento: Agendamento) => void;

}) {

  const status = obterStatus(agendamento.status);



  return (

    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">

            Consulta demonstrativa

          </p>



          <h3 className="mt-3 text-xl font-semibold text-slate-900">

            {obterNomeProfissional(

              agendamento.perfilPsicologoId

            )}

          </h3>



          <p className="mt-1 text-sm text-slate-500">

            Profissional fictício • SERENVIA

          </p>

        </div>



        <span

          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status.classe}`}

        >

          {status.texto}

        </span>

      </div>



      <div className="mt-6 grid gap-4 rounded-2xl bg-[#f8f7f4] p-5 sm:grid-cols-2">

        <div>

          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

            Data

          </p>



          <p className="mt-2 text-sm font-semibold capitalize text-slate-800">

            {formatarData(agendamento.inicio)}

          </p>

        </div>



        <div>

          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

            Horário

          </p>



          <p className="mt-2 text-sm font-semibold text-slate-800">

            {formatarHorario(agendamento.inicio)}

            {" às "}

            {formatarHorario(agendamento.fim)}

          </p>

        </div>

      </div>



      {podeAlterar && (

        <div className="mt-6 flex flex-wrap gap-3">

          <button

            type="button"

            disabled={processando}

            onClick={() => aoReagendar(agendamento)}

            className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"

          >

            Reagendar consulta

          </button>



          <button

            type="button"

            disabled={processando}

            onClick={() => aoCancelar(agendamento)}

            className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"

          >

            Cancelar consulta

          </button>

        </div>

      )}



      <div className="mt-5 border-t border-stone-100 pt-4">

        <p className="break-all text-xs text-slate-500">

          Protocolo demonstrativo: {agendamento.id}

        </p>

      </div>

    </article>

  );

}



// ==========================================*

// PÁGINA MINHAS CONSULTAS*

// ==========================================*



export default function MinhasConsultasPage() {

  const router = useRouter();



  const [usuario, setUsuario] =

    useState<Usuario | null>(null);



  const [verificandoSessao, setVerificandoSessao] =

    useState(true);



  const [carregandoConsultas, setCarregandoConsultas] =

    useState(false);



  const [consultas, setConsultas] =

    useState<Agendamento[]>([]);



  const [erro, setErro] = useState("");

  const [mensagem, setMensagem] = useState("");



  const [processando, setProcessando] =

    useState<string | null>(null);



  const [agora, setAgora] =

    useState<number | null>(null);



  // ==========================================*

  // ESTADOS DO REAGENDAMENTO*

  // ==========================================*



  const [consultaReagendamento, setConsultaReagendamento] =

    useState<Agendamento | null>(null);



  const [dataReagendamento, setDataReagendamento] =

    useState("");



  const [horarios, setHorarios] =

    useState<HorarioDisponivel[]>([]);



  const [horarioSelecionado, setHorarioSelecionado] =

    useState("");



  const [carregandoHorarios, setCarregandoHorarios] =

    useState(false);



  const [erroReagendamento, setErroReagendamento] =

    useState("");



  const [hoje, setHoje] = useState("");



  // ==========================================*

  // DATA ATUAL NO NAVEGADOR*

  // ==========================================*



  useEffect(() => {

    setAgora(Date.now());

    setHoje(dataLocalHoje());

  }, []);



  // ==========================================*

  // VERIFICAR SESSÃO*

  // ==========================================*



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

            "Não foi possível verificar sua sessão."

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

          setVerificandoSessao(false);

        }

      }

    }



    void verificarSessao();



    return () => {

      ativo = false;

    };

  }, [router]);



  // ==========================================*

  // CARREGAR CONSULTAS*

  // ==========================================*



  const carregarConsultas = useCallback(async () => {

    const resposta = await fetch(

      `${API_URL}/api/agenda/meus-agendamentos`,

      {

        method: "GET",

        credentials: "include",

        cache: "no-store",

      }

    );



    if (resposta.status === 401) {

      router.replace("/login");

      throw new Error("Sua sessão expirou.");

    }



    const dados: RespostaAgendamentos =

      await resposta.json();



    if (!resposta.ok || !dados.success) {

      throw new Error(

        dados.message ||

          "Não foi possível carregar suas consultas."

      );

    }



    if (!Array.isArray(dados.agendamentos)) {

      throw new Error(

        "Resposta inválida ao consultar agendamentos."

      );

    }



    setConsultas(dados.agendamentos);

    setAgora(Date.now());

  }, [router]);



  useEffect(() => {

    if (!usuario) return;



    let ativo = true;



    async function iniciarConsultas() {

      setCarregandoConsultas(true);

      setErro("");



      try {

        await carregarConsultas();

      } catch (error) {

        if (ativo) {

          setErro(

            error instanceof Error

              ? error.message

              : "Erro ao consultar os agendamentos."

          );

        }

      } finally {

        if (ativo) {

          setCarregandoConsultas(false);

        }

      }

    }



    void iniciarConsultas();



    return () => {

      ativo = false;

    };

  }, [usuario, carregarConsultas]);



  // ==========================================*

  // CANCELAR CONSULTA*

  // ==========================================*



  async function cancelarConsulta(agendamento: Agendamento) {

    if (processando) return;



    const confirmado = window.confirm(

      "Deseja realmente cancelar esta consulta demonstrativa?"

    );



    if (!confirmado) return;



    setProcessando(agendamento.id);

    setErro("");

    setMensagem("");



    try {

      const resposta = await fetch(

        `${API_URL}/api/agenda/meus-agendamentos/${agendamento.id}/cancelar`,

        {

          method: "PATCH",

          credentials: "include",

        }

      );



      const dados: RespostaOperacao =

        await resposta.json();



      if (!resposta.ok || !dados.success) {

        throw new Error(

          dados.message ||

            "Não foi possível cancelar a consulta."

        );

      }



      await carregarConsultas();



      setMensagem(

        "Consulta demonstrativa cancelada com sucesso."

      );

    } catch (error) {

      setErro(

        error instanceof Error

          ? error.message

          : "Erro ao cancelar consulta."

      );

    } finally {

      setProcessando(null);

    }

  }



  // ==========================================*

  // ABRIR REAGENDAMENTO*

  // ==========================================*



  function abrirReagendamento(agendamento: Agendamento) {

    if (processando) return;



    setConsultaReagendamento(agendamento);

    setDataReagendamento("");

    setHorarioSelecionado("");

    setHorarios([]);

    setErroReagendamento("");

    setErro("");

    setMensagem("");

  }



  function fecharReagendamento() {

    if (processando) return;



    setConsultaReagendamento(null);

    setDataReagendamento("");

    setHorarioSelecionado("");

    setHorarios([]);

    setErroReagendamento("");

  }



  // ==========================================*

  // CONSULTAR HORÁRIOS DISPONÍVEIS*

  // ==========================================*



  useEffect(() => {

    if (

      !consultaReagendamento ||

      !dataReagendamento

    ) {

      return;

    }



    const controlador = new AbortController();



    async function buscarHorarios() {

      setCarregandoHorarios(true);

      setErroReagendamento("");

      setHorarios([]);

      setHorarioSelecionado("");



      try {

        const parametros = new URLSearchParams({

          perfilPsicologoId:

            consultaReagendamento!.perfilPsicologoId,

          data: dataReagendamento,

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

              "Não foi possível consultar os horários."

          );

        }



        if (!controlador.signal.aborted) {

          setHorarios(dados.horarios ?? []);

        }

      } catch (error) {

        if (controlador.signal.aborted) return;



        setErroReagendamento(

          error instanceof Error

            ? error.message

            : "Erro ao consultar horários."

        );

      } finally {

        if (!controlador.signal.aborted) {

          setCarregandoHorarios(false);

        }

      }

    }



    void buscarHorarios();



    return () => {

      controlador.abort();

    };

  }, [consultaReagendamento, dataReagendamento]);



  // ==========================================*

  // CONFIRMAR REAGENDAMENTO*

  // ==========================================*



  async function confirmarReagendamento() {

    if (

      !consultaReagendamento ||

      !horarioSelecionado ||

      processando

    ) {

      return;

    }



    setProcessando(consultaReagendamento.id);

    setErroReagendamento("");

    setMensagem("");



    try {

      const resposta = await fetch(

        `${API_URL}/api/agenda/meus-agendamentos/${consultaReagendamento.id}/reagendar`,

        {

          method: "PATCH",

          credentials: "include",

          headers: {

            "Content-Type": "application/json",

          },

          body: JSON.stringify({

            inicio: horarioSelecionado,

          }),

        }

      );



      const dados: RespostaOperacao =

        await resposta.json();



      if (!resposta.ok || !dados.success) {

        throw new Error(

          dados.message ||

            "Não foi possível reagendar a consulta."

        );

      }



      await carregarConsultas();



      setConsultaReagendamento(null);

      setDataReagendamento("");

      setHorarioSelecionado("");

      setHorarios([]);



      setMensagem(

        "Consulta reagendada com sucesso! Aguardando nova confirmação da profissional demonstrativa."

      );

    } catch (error) {

      setErroReagendamento(

        error instanceof Error

          ? error.message

          : "Erro ao reagendar consulta."

      );

    } finally {

      setProcessando(null);

    }

  }



  // ==========================================*

  // SEPARAR CONSULTAS*

  // ==========================================*



  const consultasFuturas = consultas
    .filter((consulta) =>
      agora !== null &&
      new Date(consulta.inicio).getTime() > agora &&
      (consulta.status === "PENDENTE" || consulta.status === "CONFIRMADO")
    )
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const consultasAnteriores = consultas
    .filter((consulta) =>
      agora !== null &&
      (new Date(consulta.inicio).getTime() <= agora ||
        consulta.status === "CANCELADO" ||
        consulta.status === "CONCLUIDO")
    )
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  const pendentes = consultas.filter((c) => c.status === "PENDENTE").length;
  const confirmadas = consultas.filter((c) => c.status === "CONFIRMADO").length;
  const concluidas = consultas.filter((c) => c.status === "CONCLUIDO").length;
  const canceladas = consultas.filter((c) => c.status === "CANCELADO").length;

  function podeAlterar(consulta: Agendamento) {

    return (

      agora !== null &&

      new Date(consulta.inicio).getTime() > agora &&

      ["PENDENTE", "CONFIRMADO"].includes(

        consulta.status

      )

    );

  }



  // ==========================================*

  // CARREGAMENTO INICIAL*

  // ==========================================*



  if (verificandoSessao) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4]">

        <div className="text-center">

          <p className="text-2xl font-semibold text-teal-800">

            SERENVIA

          </p>



          <p className="mt-4 text-slate-600">

            Verificando sua sessão...

          </p>

        </div>

      </main>

    );

  }



  if (erro && !usuario) {

    return (

      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f8f7f4] px-6">

        <p className="text-2xl font-semibold text-teal-800">

          SERENVIA

        </p>



        <p role="alert" className="text-red-700">

          {erro}

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



  if (!usuario) return null;



  // ==========================================*

  // INTERFACE*

  // ==========================================*



  return (

    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">

      {/* CABEÇALHO */}



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

        {/* TÍTULO */}



        <section>

          <span className="inline-block rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800">

            SERENVIA • Área do paciente

          </span>



          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">

            Minhas consultas

          </h1>



          <p className="mt-4 max-w-2xl leading-7 text-slate-600">

            Acompanhe seus agendamentos demonstrativos,

            consulte datas, horários e gerencie suas

            solicitações.

          </p>

        </section>



        {/* RESUMO */}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { titulo: "Total de consultas", valor: consultas.length, cor: "text-teal-800" },
            { titulo: "Próximas consultas", valor: consultasFuturas.length, cor: "text-teal-800" },
            { titulo: "Pendentes", valor: pendentes, cor: "text-amber-700" },
            { titulo: "Confirmadas", valor: confirmadas, cor: "text-emerald-700" },
            { titulo: "Concluídas", valor: concluidas, cor: "text-slate-700" },
            { titulo: "Canceladas", valor: canceladas, cor: "text-red-700" },
          ].map((item) => (
            <div key={item.titulo} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{item.titulo}</p>
              <p className={`mt-3 text-3xl font-semibold ${item.cor}`}>{item.valor}</p>
            </div>
          ))}
        </section>

        <div className="mt-7 flex justify-end">
          <button
            type="button"
            disabled={carregandoConsultas || processando !== null}
            onClick={() => {
              setErro("");
              setMensagem("");
              void carregarConsultas().catch((error) =>
                setErro(error instanceof Error ? error.message : "Erro ao atualizar consultas.")
              );
            }}
            className="rounded-xl border border-teal-700 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
          >
            Atualizar lista
          </button>
        </div>

        {carregandoConsultas && (

          <p className="mt-10 text-sm text-teal-800">

            Carregando suas consultas...

          </p>

        )}



        {erro && (

          <div

            role="alert"

            className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"

          >

            {erro}

          </div>

        )}



        {mensagem && (

          <div

            role="status"

            className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"

          >

            {mensagem}

          </div>

        )}



        {/* CONSULTAS FUTURAS */}



        {!carregandoConsultas &&

          !erro &&

          consultasFuturas.length > 0 && (

            <section className="mt-10">

              <h2 className="mb-5 text-xl font-semibold">

                Próximas consultas

              </h2>



              <div className="space-y-5">

                {consultasFuturas.map((consulta) => (

                  <CartaoConsulta

                    key={consulta.id}

                    agendamento={consulta}

                    podeAlterar={podeAlterar(consulta)}

                    processando={processando !== null}

                    aoCancelar={(item) =>

                      void cancelarConsulta(item)

                    }

                    aoReagendar={abrirReagendamento}

                  />

                ))}

              </div>

            </section>

          )}



        {/* HISTÓRICO */}



        {!carregandoConsultas &&

          !erro &&

          consultasAnteriores.length > 0 && (

            <section className="mt-10">

              <h2 className="mb-5 text-xl font-semibold">

                Histórico de consultas

              </h2>



              <div className="space-y-5">

                {consultasAnteriores.map((consulta) => (

                  <CartaoConsulta

                    key={consulta.id}

                    agendamento={consulta}

                    podeAlterar={false}

                    processando={false}

                    aoCancelar={() => {}}

                    aoReagendar={() => {}}

                  />

                ))}

              </div>

            </section>

          )}



        {/* SEM CONSULTAS */}



        {!carregandoConsultas &&

          !erro &&

          consultas.length === 0 && (

            <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">

              <h2 className="text-xl font-semibold">

                Nenhuma consulta encontrada

              </h2>



              <p className="mt-3 text-slate-600">

                Você ainda não possui agendamentos

                demonstrativos.

              </p>



              <Link

                href="/paciente/agendar"

                className="mt-6 inline-block rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white transition hover:bg-teal-900"

              >

                Agendar consulta

              </Link>

            </section>

          )}



        {/* NOVO AGENDAMENTO */}



        {!carregandoConsultas &&

          !erro &&

          consultas.length > 0 && (

            <div className="mt-10">

              <Link

                href="/paciente/agendar"

                className="inline-block rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white transition hover:bg-teal-900"

              >

                + Agendar nova consulta

              </Link>

            </div>

          )}



        {/* AVISO */}



        <section className="mt-12 rounded-2xl border border-violet-200 bg-violet-50 p-6">

          <h2 className="font-semibold text-violet-900">

            Ambiente 100% demonstrativo

          </h2>



          <p className="mt-2 text-sm leading-7 text-violet-800">

            O SERENVIA é um projeto fictício desenvolvido

            pela AW TECHNOLOGY para demonstração de

            funcionalidades de sistemas web. Não há

            atendimentos psicológicos, pagamentos ou

            prestação de serviços de saúde.

          </p>

        </section>



        {/* RODAPÉ */}



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



      {/* MODAL DE REAGENDAMENTO */}



      {consultaReagendamento && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"

          role="presentation"

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="titulo-reagendamento"

            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"

          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">

                  SERENVIA • Demonstração

                </p>



                <h2

                  id="titulo-reagendamento"

                  className="mt-2 text-2xl font-semibold"

                >

                  Reagendar consulta

                </h2>

              </div>



              <button

                type="button"

                onClick={fecharReagendamento}

                disabled={processando !== null}

                aria-label="Fechar reagendamento"

                className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-stone-100 disabled:opacity-50"

              >

                ×

              </button>

            </div>



            <div className="mt-6 rounded-2xl bg-[#f8f7f4] p-5">

              <p className="text-sm font-semibold text-teal-900">

                {obterNomeProfissional(

                  consultaReagendamento.perfilPsicologoId

                )}

              </p>



              <p className="mt-2 text-sm text-slate-600">

                Horário atual:{" "}

                {formatarData(

                  consultaReagendamento.inicio

                )}

                , às{" "}

                {formatarHorario(

                  consultaReagendamento.inicio

                )}

              </p>

            </div>



            <div className="mt-6">

              <label

                htmlFor="data-reagendamento"

                className="block text-sm font-semibold text-slate-800"

              >

                Escolha uma nova data

              </label>



              <input

                id="data-reagendamento"

                type="date"

                value={dataReagendamento}

                min={hoje || undefined}

                disabled={processando !== null}

                onChange={(evento) => {

                  setDataReagendamento(

                    evento.target.value

                  );

                  setHorarioSelecionado("");

                  setHorarios([]);

                  setErroReagendamento("");

                }}

                className="mt-3 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-teal-700"

              />

            </div>



            {carregandoHorarios && (

              <p

                role="status"

                className="mt-5 text-sm text-teal-800"

              >

                Consultando horários disponíveis...

              </p>

            )}



            {dataReagendamento &&

              !carregandoHorarios &&

              horarios.length === 0 &&

              !erroReagendamento && (

                <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">

                  Nenhum horário disponível nesta data.

                  Escolha outro dia.

                </p>

              )}



            {horarios.length > 0 && (

              <div className="mt-6">

                <p className="text-sm font-semibold">

                  Horários disponíveis

                </p>



                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">

                  {horarios.map((horario) => {

                    const selecionado =

                      horarioSelecionado ===

                      horario.inicio;



                    return (

                      <button

                        key={horario.inicio}

                        type="button"

                        disabled={processando !== null}

                        onClick={() =>

                          setHorarioSelecionado(

                            horario.inicio

                          )

                        }

                        aria-pressed={selecionado}

                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition disabled:opacity-50 ${

                          selecionado

                            ? "border-teal-800 bg-teal-800 text-white"

                            : "border-stone-300 bg-white text-teal-800 hover:bg-teal-50"

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



            {erroReagendamento && (

              <div

                role="alert"

                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"

              >

                {erroReagendamento}

              </div>

            )}



            <p className="mt-6 text-xs leading-6 text-slate-500">

              Ao reagendar, a consulta voltará ao status

              de aguardando confirmação. A profissional

              demonstrativa precisará confirmar o novo

              horário.

            </p>



            <div className="mt-7 flex flex-wrap justify-end gap-3">

              <button

                type="button"

                onClick={fecharReagendamento}

                disabled={processando !== null}

                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50"

              >

                Voltar

              </button>



              <button

                type="button"

                onClick={() =>

                  void confirmarReagendamento()

                }

                disabled={

                  !horarioSelecionado ||

                  processando !== null ||

                  carregandoHorarios

                }

                className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"

              >

                {processando

                  ? "Salvando..."

                  : "Confirmar reagendamento"}

              </button>

            </div>

          </section>

        </div>

      )}

    </main>

  );

}