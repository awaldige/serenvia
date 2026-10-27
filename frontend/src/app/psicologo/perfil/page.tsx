"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ==========================================
// TIPOS
// ==========================================

type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
};

type DadosPerfil = {
  success: boolean;

  usuario: {
    id: string;
    nome: string;
    email: string;
    tipo: string;
  };

  perfil: {
    id: string;
    crpNumero: string;
    crpUf: string;
    telefone: string;
    especialidade: string | null;
    biografia: string | null;
    valorConsulta: string;
    status: string;
    aprovadoEm: string | null;
    endereco: Endereco | null;
  };
};

// ==========================================
// CONFIGURAÇÃO DA API
// ==========================================

const API_URL = "";
// ==========================================
// FORMATAÇÃO
// ==========================================

function formatarMoeda(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Não informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numero);
}

function formatarTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      "($1) $2-$3"
    );
  }

  if (numeros.length === 10) {
    return numeros.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      "($1) $2-$3"
    );
  }

  return telefone;
}

function formatarCep(cep: string) {
  const numeros = cep.replace(/\D/g, "");

  if (numeros.length === 8) {
    return numeros.replace(
      /^(\d{5})(\d{3})$/,
      "$1-$2"
    );
  }

  return cep;
}

function formatarData(data: string | null) {
  if (!data) {
    return "Não informado";
  }

  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(valor);
}

// ==========================================
// CONFIGURAÇÃO DO STATUS PROFISSIONAL
// ==========================================

function obterStatus(
  status: string,
  modoDemonstracao: boolean
) {
  switch (status) {
    case "APROVADO":
      return {
        titulo: modoDemonstracao
          ? "Perfil aprovado na simulação"
          : "Perfil aprovado",

        descricao: modoDemonstracao
          ? "Este cadastro fictício foi aprovado administrativamente no ambiente demonstrativo. A aprovação não representa validação oficial do registro profissional."
          : "Seu cadastro profissional foi aprovado.",

        estilo:
          "border-emerald-200 bg-emerald-50 text-emerald-900",
      };

    case "PENDENTE":
      return {
        titulo: modoDemonstracao
          ? "Aguardando análise simulada"
          : "Aguardando aprovação",

        descricao: modoDemonstracao
          ? "Este cadastro fictício aguarda uma decisão administrativa simulada. Nenhuma verificação oficial de CRP é realizada neste ambiente."
          : "Seu cadastro está em análise. O registro profissional precisa ser verificado antes da publicação do perfil.",

        estilo:
          "border-amber-200 bg-amber-50 text-amber-900",
      };

    case "REJEITADO":
      return {
        titulo: modoDemonstracao
          ? "Cadastro rejeitado na simulação"
          : "Cadastro não aprovado",

        descricao: modoDemonstracao
          ? "Este cadastro fictício foi rejeitado durante a simulação administrativa. A análise poderá ser reaberta pela administração."
          : "Seu cadastro não foi aprovado. Entre em contato com a administração para obter orientações.",

        estilo:
          "border-red-200 bg-red-50 text-red-900",
      };

    case "SUSPENSO":
      return {
        titulo: modoDemonstracao
          ? "Perfil suspenso na simulação"
          : "Perfil suspenso",

        descricao: modoDemonstracao
          ? "Este perfil fictício está suspenso no ambiente demonstrativo. A reativação depende de uma nova decisão administrativa simulada."
          : "Seu perfil está temporariamente suspenso.",

        estilo:
          "border-red-200 bg-red-50 text-red-900",
      };

    default:
      return {
        titulo: "Cadastro em preparação",

        descricao: modoDemonstracao
          ? "Este perfil fictício ainda está em preparação e não está disponível no catálogo demonstrativo."
          : "Seu perfil profissional ainda não está disponível publicamente.",

        estilo:
          "border-slate-200 bg-slate-50 text-slate-700",
      };
  }
}

// ==========================================
// COMPONENTE DE EXIBIÇÃO DOS CAMPOS
// ==========================================

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-stone-100 bg-[#faf9f6] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-900">
        {valor || "Não informado"}
      </p>
    </div>
  );
}

// ==========================================
// PÁGINA DO PERFIL PROFISSIONAL
// ==========================================

export default function PerfilPsicologoPage() {
  const router = useRouter();

  const [dados, setDados] =
    useState<DadosPerfil | null>(null);

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState("");

  // ========================================
  // MODO DEMONSTRATIVO
  // ========================================

  // O projeto SERENVIA está sendo apresentado
  // como portfólio demonstrativo.
  //
  // Esta variável controla apenas os textos
  // e avisos da interface.
  //
  // As regras de autorização e validação
  // continuam sendo responsabilidade do backend.

  const modoDemonstracao =
    process.env.NEXT_PUBLIC_APP_MODE !== "production";

  // ========================================
  // CARREGAR PERFIL DO PSICÓLOGO
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function carregarPerfil() {
      try {
        const resposta = await fetch(
          `${API_URL}/api/psicologos/me`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        // SESSÃO NÃO AUTENTICADA

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        // ACESSO NÃO AUTORIZADO

        if (resposta.status === 403) {
          router.replace("/");
          return;
        }

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível carregar seu perfil profissional."
          );
        }

        const resultado: DadosPerfil =
          await resposta.json();

        if (
          !resultado.success ||
          !resultado.usuario ||
          !resultado.perfil
        ) {
          throw new Error(
            "Não foi possível carregar os dados."
          );
        }

        if (!controller.signal.aborted) {
          setDados(resultado);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    void carregarPerfil();

    return () => controller.abort();
  }, [router]);

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-4">
        <div className="text-center">
          <p className="text-2xl font-bold tracking-widest text-teal-800">
            SERENVIA
          </p>

          <div className="mx-auto mt-6 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" />

          <p
            role="status"
            className="mt-5 text-sm text-slate-600"
          >
            Carregando perfil profissional...
          </p>
        </div>
      </main>
    );
  }

  // ========================================
  // TRATAMENTO DE ERROS
  // ========================================

  if (erro || !dados) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-800">
            SERENVIA
          </p>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Não foi possível carregar o perfil
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {erro || "Dados não encontrados."}
          </p>

          <Link
            href="/psicologo"
            className="mt-6 inline-flex rounded-xl bg-teal-800 px-6 py-3 font-semibold text-white transition hover:bg-teal-900"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  // ========================================
  // DADOS DO PERFIL
  // ========================================

  const { usuario, perfil } = dados;

  const status = obterStatus(
    perfil.status,
    modoDemonstracao
  );

  // ========================================
  // VERIFICAR PERMISSÃO DE EDIÇÃO
  // ========================================

  const podeEditar =
    perfil.status !== "REJEITADO" &&
    perfil.status !== "SUSPENSO";

  // ========================================
  // INTERFACE SERENVIA
  // ========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* NAVEGAÇÃO */}

        <Link
          href="/psicologo"
          className="inline-flex items-center text-sm font-semibold text-teal-800 transition hover:text-teal-950"
        >
          ← Voltar ao painel
        </Link>

        {/* AVISO DEMONSTRATIVO */}

        {modoDemonstracao && (
          <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                Ambiente demonstrativo
              </span>

              <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Perfis fictícios
              </span>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-violet-950">
              Perfil profissional de demonstração
            </h2>

            <p className="mt-3 text-sm leading-7 text-violet-900">
              O SERENVIA é um projeto de portfólio
              desenvolvido pela AW TECHNOLOGY.
              Os profissionais, registros e informações
              apresentados neste ambiente são fictícios.
            </p>

            <p className="mt-3 text-sm leading-7 text-violet-900">
              As aprovações e demais operações
              administrativas são simuladas.
              Nenhum registro representa validação
              profissional perante o Conselho Regional
              de Psicologia.
            </p>

            <p className="mt-3 text-xs font-medium leading-6 text-violet-800">
              Não são realizados atendimentos
              psicológicos reais nesta plataforma.
            </p>
          </section>
        )}

        {/* CABEÇALHO */}

        <header className="mt-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 p-8 text-white shadow-sm sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                SERENVIA • Área profissional
              </span>

              <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
                Meu perfil profissional
              </h1>

              <p className="mt-4 max-w-2xl leading-7 text-teal-50">
                Consulte e gerencie as informações
                do seu perfil profissional no SERENVIA.
              </p>

              <p className="mt-3 text-sm text-teal-100">
                Um caminho para o bem-estar emocional.
              </p>
            </div>

            {podeEditar && (
              <Link
                href="/psicologo/perfil/editar"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-900 transition hover:bg-teal-50"
              >
                Editar perfil →
              </Link>
            )}
          </div>
        </header>

        {/* STATUS PROFISSIONAL */}

        <section
          className={`mt-6 rounded-3xl border p-7 ${status.estilo}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">
              {status.titulo}
            </h2>

            {modoDemonstracao && (
              <span className="rounded-full border border-current px-3 py-1 text-xs font-semibold">
                Status simulado
              </span>
            )}
          </div>

          <p className="mt-3 text-sm leading-7">
            {status.descricao}
          </p>
        </section>

        {/* DADOS PESSOAIS */}

        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <h2 className="text-xl font-bold">
              Dados pessoais
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Informações de identificação do cadastro.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Campo
                titulo="Nome completo"
                valor={usuario.nome}
              />

              <Campo
                titulo="E-mail"
                valor={usuario.email}
              />

              <Campo
                titulo="Telefone"
                valor={formatarTelefone(
                  perfil.telefone
                )}
              />
            </div>
          </section>

          {/* INFORMAÇÕES PROFISSIONAIS */}

          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <h2 className="text-xl font-bold">
              Informações profissionais
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Dados apresentados no perfil cadastrado.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Campo
                titulo={
                  modoDemonstracao
                    ? "Registro CRP (fictício)"
                    : "Registro profissional informado"
                }
                valor={`${perfil.crpNumero}/${perfil.crpUf}`}
              />

              <Campo
                titulo="Especialidade"
                valor={
                  perfil.especialidade ||
                  "Não informada"
                }
              />

              <Campo
                titulo={
                  modoDemonstracao
                    ? "Valor demonstrativo da consulta"
                    : "Valor da consulta"
                }
                valor={formatarMoeda(
                  perfil.valorConsulta
                )}
              />

              <Campo
                titulo="Situação do cadastro"
                valor={status.titulo}
              />

              <Campo
                titulo={
                  modoDemonstracao
                    ? "Data da aprovação simulada"
                    : "Data da aprovação"
                }
                valor={formatarData(
                  perfil.aprovadoEm
                )}
              />
            </div>

            <div className="mt-7 border-t border-stone-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Biografia profissional
              </h3>

              <div className="mt-3 rounded-xl bg-[#faf9f6] p-5">
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {perfil.biografia ||
                    "Nenhuma biografia cadastrada."}
                </p>
              </div>
            </div>
          </section>

          {/* ENDEREÇO PROFISSIONAL */}

          <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
            <h2 className="text-xl font-bold">
              Endereço cadastrado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Informações de localização vinculadas ao perfil.
            </p>

            {perfil.endereco ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Campo
                  titulo="CEP"
                  valor={formatarCep(
                    perfil.endereco.cep
                  )}
                />

                <Campo
                  titulo="Logradouro"
                  valor={
                    perfil.endereco.logradouro
                  }
                />

                <Campo
                  titulo="Número"
                  valor={perfil.endereco.numero}
                />

                <Campo
                  titulo="Complemento"
                  valor={
                    perfil.endereco.complemento ||
                    "Não informado"
                  }
                />

                <Campo
                  titulo="Bairro"
                  valor={perfil.endereco.bairro}
                />

                <Campo
                  titulo="Cidade"
                  valor={perfil.endereco.cidade}
                />

                <Campo
                  titulo="Estado"
                  valor={perfil.endereco.uf}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-xl bg-[#faf9f6] p-5">
                <p className="text-sm text-slate-600">
                  Nenhum endereço cadastrado.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* BOTÃO INFERIOR */}

        {podeEditar && (
          <div className="mt-8 flex justify-center">
            <Link
              href="/psicologo/perfil/editar"
              className="inline-flex items-center justify-center rounded-xl bg-teal-800 px-8 py-3 font-semibold text-white transition hover:bg-teal-900"
            >
              Editar informações profissionais →
            </Link>
          </div>
        )}

        {/* RODAPÉ */}

        <footer className="mt-12 border-t border-stone-200 pt-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold tracking-widest text-teal-800 hover:text-teal-950"
          >
            SERENVIA
          </Link>

          <p className="mt-2 text-sm text-slate-500">
            Um caminho para o bem-estar emocional.
          </p>

          <p className="mt-4 text-xs text-slate-500">
            © 2026 SERENVIA. Projeto demonstrativo
            desenvolvido por AW TECHNOLOGY.
          </p>

          {modoDemonstracao && (
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Perfis fictícios • Sem validação oficial de CRP •
              Sem atendimento psicológico real
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}