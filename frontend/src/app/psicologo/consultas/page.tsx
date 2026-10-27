"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "";

type StatusConsulta = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "CONCLUIDO";
type Agendamento = {
  id: string;
  inicio: string;
  fim: string;
  status: StatusConsulta;
  criadoEm: string;
  concluidoEm?: string | null;
  paciente: { id: string; nome: string };
};
type RespostaAgendamentos = {
  success: boolean;
  total?: number;
  agendamentos?: Agendamento[];
  message?: string;
};
type Usuario = {
  id: string;
  nome: string;
  tipo: "PACIENTE" | "PSICOLOGO" | "ADMIN";
  statusPsicologo?: string | null;
};

function formatarData(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(data));
}
function formatarHora(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(data));
}

const estilosStatus: Record<StatusConsulta, { titulo: string; estilo: string }> = {
  PENDENTE: { titulo: "Aguardando confirmação", estilo: "bg-amber-100 text-amber-800" },
  CONFIRMADO: { titulo: "Confirmada", estilo: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { titulo: "Cancelada", estilo: "bg-red-100 text-red-800" },
  CONCLUIDO: { titulo: "Concluída", estilo: "bg-slate-100 text-slate-700" },
};

export default function ConsultasPsicologoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [consultas, setConsultas] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [recarregando, setRecarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [agora, setAgora] = useState<number | null>(null);

  const carregarConsultas = useCallback(async () => {
    const resposta = await fetch(`${API_URL}/api/agenda/psicologo/agendamentos`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (resposta.status === 401) {
      router.replace("/login");
      throw new Error("Sua sessão expirou.");
    }
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      throw new Error(dados?.message || "Não foi possível carregar as consultas.");
    }
    const dados: RespostaAgendamentos = await resposta.json();
    if (!dados.success || !Array.isArray(dados.agendamentos)) {
      throw new Error("Resposta inválida do servidor.");
    }
    setConsultas(dados.agendamentos);
    setAgora(Date.now());
  }, [router]);

  useEffect(() => {
    const atualizarRelogio = () => setAgora(Date.now());
    atualizarRelogio();
    const intervalo = window.setInterval(atualizarRelogio, 30_000);
    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    let ativo = true;
    async function iniciar() {
      try {
        const resposta = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET", credentials: "include", cache: "no-store",
        });
        if (!ativo) return;
        if (resposta.status === 401) { router.replace("/login"); return; }
        if (!resposta.ok) throw new Error("Não foi possível verificar sua sessão.");
        const dados = await resposta.json();
        if (!ativo) return;
        if (!dados.success || !dados.usuario) { router.replace("/login"); return; }
        const usuarioAtual: Usuario = dados.usuario;
        if (usuarioAtual.tipo !== "PSICOLOGO") {
          router.replace(usuarioAtual.tipo === "PACIENTE" ? "/paciente" : "/admin");
          return;
        }
        if (usuarioAtual.statusPsicologo !== "APROVADO") {
          router.replace("/psicologo");
          return;
        }
        setUsuario(usuarioAtual);
        await carregarConsultas();
      } catch (error) {
        if (ativo) setErro(error instanceof Error ? error.message : "Erro ao carregar consultas.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void iniciar();
    return () => { ativo = false; };
  }, [router, carregarConsultas]);

  async function atualizarLista() {
    if (atualizando || recarregando) return;
    setRecarregando(true);
    setErro("");
    setMensagem("");
    try {
      await carregarConsultas();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao atualizar consultas.");
    } finally {
      setRecarregando(false);
    }
  }

  async function alterarStatus(consulta: Agendamento, acao: "confirmar" | "cancelar" | "concluir") {
    if (atualizando || recarregando) return;
    if (acao === "cancelar" && !window.confirm(
      `Deseja cancelar a consulta demonstrativa de ${consulta.paciente.nome}?`
    )) return;
    if (acao === "concluir") {
      if (consulta.status !== "CONFIRMADO" || new Date(consulta.fim).getTime() > Date.now()) {
        setErro("Somente consultas confirmadas e já encerradas podem ser concluídas.");
        return;
      }
      if (!window.confirm(
        `Deseja marcar como concluída a consulta demonstrativa de ${consulta.paciente.nome}? Essa ação não poderá ser desfeita.`
      )) return;
    }
    setAtualizando(consulta.id);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch(
        `${API_URL}/api/agenda/psicologo/agendamentos/${encodeURIComponent(consulta.id)}/${acao}`,
        { method: "PATCH", credentials: "include" }
      );
      const dados = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados?.success) {
        throw new Error(dados?.message || "Não foi possível atualizar a consulta.");
      }
      await carregarConsultas();
      const mensagens = {
        confirmar: "Consulta demonstrativa confirmada com sucesso!",
        cancelar: "Consulta demonstrativa cancelada com sucesso!",
        concluir: "Consulta demonstrativa concluída com sucesso!",
      };
      setMensagem(mensagens[acao]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao atualizar a consulta.");
    } finally {
      setAtualizando(null);
    }
  }

  const pendentes = consultas.filter((c) => c.status === "PENDENTE").length;
  const confirmadas = consultas.filter((c) => c.status === "CONFIRMADO").length;
  const canceladas = consultas.filter((c) => c.status === "CANCELADO").length;
  const concluidas = consultas.filter((c) => c.status === "CONCLUIDO").length;
  const proximas = agora === null ? [] : consultas
    .filter((c) => (c.status === "PENDENTE" || c.status === "CONFIRMADO") && new Date(c.inicio).getTime() > agora)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const historico = agora === null ? [] : consultas
    .filter((c) => c.status === "CANCELADO" || c.status === "CONCLUIDO" || new Date(c.inicio).getTime() <= agora)
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  function renderizarConsulta(consulta: Agendamento) {
    const status = estilosStatus[consulta.status];
    const futura = agora !== null && new Date(consulta.inicio).getTime() > agora;
    const encerrada = agora !== null && new Date(consulta.fim).getTime() <= agora;
    const podeConfirmar = consulta.status === "PENDENTE" && futura;
    const podeCancelar = (consulta.status === "PENDENTE" || consulta.status === "CONFIRMADO") && futura;
    const podeConcluir = consulta.status === "CONFIRMADO" && encerrada;
    return (
      <article key={consulta.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Consulta demonstrativa</p>
            <h3 className="mt-2 text-xl font-semibold">{consulta.paciente.nome}</h3>
            <p className="mt-2 text-sm text-slate-600">{formatarData(consulta.inicio)}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatarHora(consulta.inicio)} às {formatarHora(consulta.fim)}
            </p>
            {consulta.status === "CONCLUIDO" && consulta.concluidoEm && (
              <p className="mt-2 text-xs text-slate-500">
                Concluída em {formatarData(consulta.concluidoEm)} às {formatarHora(consulta.concluidoEm)}
              </p>
            )}
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-semibold ${status.estilo}`}>
            {status.titulo}
          </span>
        </div>
        <div className="mt-6 border-t border-stone-100 pt-5">
          <p className="break-all text-xs text-slate-500">Identificador: {consulta.id}</p>
        </div>
        {(podeConfirmar || podeCancelar || podeConcluir) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {podeConfirmar && (
              <button type="button" disabled={atualizando !== null || recarregando}
                onClick={() => void alterarStatus(consulta, "confirmar")}
                className="rounded-xl bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:opacity-50">
                {atualizando === consulta.id ? "Processando..." : "Confirmar consulta"}
              </button>
            )}
            {podeCancelar && (
              <button type="button" disabled={atualizando !== null || recarregando}
                onClick={() => void alterarStatus(consulta, "cancelar")}
                className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                Cancelar consulta
              </button>
            )}
            {podeConcluir && (
              <button type="button" disabled={atualizando !== null || recarregando}
                onClick={() => void alterarStatus(consulta, "concluir")}
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-50">
                {atualizando === consulta.id ? "Processando..." : "Concluir consulta"}
              </button>
            )}
          </div>
        )}
      </article>
    );
  }

  if (carregando) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4]">
      <p className="text-teal-800">Carregando consultas demonstrativas...</p>
    </main>;
  }
  if (!usuario) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="text-slate-700">{erro || "Redirecionando..."}</p>
        {erro && <button type="button" onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-teal-800 px-5 py-3 text-white">Tentar novamente</button>}
      </div>
    </main>;
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-2xl font-semibold text-teal-800">SEREN<span className="text-teal-600">VIA</span></Link>
          <Link href="/psicologo" className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">← Voltar ao painel</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <section className="rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 px-8 py-10 text-white sm:px-12">
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">SERENVIA • Área profissional</span>
          <h1 className="mt-7 text-3xl font-semibold sm:text-4xl">Minhas consultas</h1>
          <p className="mt-4 max-w-2xl leading-7 text-teal-50">Acompanhe solicitações, confirme horários e gerencie consultas demonstrativas em um único lugar.</p>
        </section>
        <section className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-6">
          <h2 className="font-semibold text-violet-900">Ambiente demonstrativo</h2>
          <p className="mt-2 text-sm leading-7 text-violet-800">Todos os pacientes e profissionais são fictícios. Os agendamentos representam simulações e não correspondem a atendimentos psicológicos reais.</p>
        </section>
        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Resumo das consultas">
          {[
            { titulo: "Total de consultas", valor: consultas.length, estilo: "text-teal-800" },
            { titulo: "Próximas consultas", valor: proximas.length, estilo: "text-teal-800" },
            { titulo: "Pendentes", valor: pendentes, estilo: "text-amber-700" },
            { titulo: "Confirmadas", valor: confirmadas, estilo: "text-emerald-700" },
            { titulo: "Concluídas", valor: concluidas, estilo: "text-slate-700" },
            { titulo: "Canceladas", valor: canceladas, estilo: "text-red-700" },
          ].map((item) => (
            <div key={item.titulo} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-600">{item.titulo}</p>
              <p className={`mt-3 text-3xl font-semibold ${item.estilo}`}>{item.valor}</p>
            </div>
          ))}
        </section>
        {erro && <div role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
        {mensagem && <div role="status" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{mensagem}</div>}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">{consultas.length} consulta(s) demonstrativa(s) encontrada(s).</p>
          <button type="button" disabled={atualizando !== null || recarregando}
            onClick={() => void atualizarLista()}
            className="rounded-xl border border-teal-700 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50">
            {recarregando ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Próximas consultas</h2>
          <p className="mt-2 text-sm text-slate-600">Agendamentos futuros pendentes ou confirmados.</p>
          {proximas.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-slate-600">Nenhuma próxima consulta encontrada.</div>
          ) : (
            <div className="mt-5 grid gap-5">{proximas.map(renderizarConsulta)}</div>
          )}
        </section>
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Histórico de consultas</h2>
          <p className="mt-2 text-sm text-slate-600">Consultas anteriores, concluídas e canceladas.</p>
          {historico.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-slate-600">Nenhum registro no histórico.</div>
          ) : (
            <div className="mt-5 grid gap-5">{historico.map(renderizarConsulta)}</div>
          )}
        </section>
        <footer className="mt-14 border-t border-stone-200 pt-8 text-center">
          <p className="font-semibold text-teal-800">SERENVIA</p>
          <p className="mt-3 text-xs text-slate-500">Projeto demonstrativo desenvolvido por AW TECHNOLOGY. Sem atendimento psicológico real.</p>
        </footer>
      </div>
    </main>
  );
}
