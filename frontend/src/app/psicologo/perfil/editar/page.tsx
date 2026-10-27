"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const API_URL = "";

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

type Perfil = {
  crpNumero: string;
  crpUf: string;
  telefone: string;
  especialidade: string | null;
  biografia: string | null;
  valorConsulta: string;
  status: string;
  endereco: Endereco | null;
};

type RespostaPerfil = {
  success: boolean;
  message?: string;
  usuario?: {
    nome: string;
    email: string;
  };
  perfil?: Perfil;
};

type Formulario = {
  telefone: string;
  especialidade: string;
  biografia: string;
  valorConsulta: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

const formularioInicial: Formulario = {
  telefone: "",
  especialidade: "",
  biografia: "",
  valorConsulta: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

// ==========================================
// COMPONENTE DE FORMULÁRIO
// ==========================================

function CampoFormulario({
  id,
  titulo,
  valor,
  alterar,
  obrigatorio = false,
  maxLength = 200,
  placeholder,
}: {
  id: string;
  titulo: string;
  valor: string;
  alterar: (valor: string) => void;
  obrigatorio?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        {titulo}

        {obrigatorio && (
          <span className="ml-1 text-red-600">*</span>
        )}
      </label>

      <input
        id={id}
        type="text"
        value={valor}
        onChange={(evento) => alterar(evento.target.value)}
        required={obrigatorio}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
      />
    </div>
  );
}

// ==========================================
// PÁGINA DE EDIÇÃO SERENVIA
// ==========================================

export default function EditarPerfilPsicologoPage() {
  const router = useRouter();

  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [nome, setNome] = useState("");
  const [crp, setCrp] = useState("");
  const [status, setStatus] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ========================================
  // CARREGAR DADOS ATUAIS
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

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        if (resposta.status === 403) {
          router.replace("/");
          return;
        }

        if (!resposta.ok) {
          throw new Error(
            "Não foi possível carregar o perfil profissional."
          );
        }

        const dados: RespostaPerfil = await resposta.json();

        if (!dados.success || !dados.usuario || !dados.perfil) {
          throw new Error("Dados profissionais não encontrados.");
        }

        if (controller.signal.aborted) return;

        const perfil = dados.perfil;
        const endereco = perfil.endereco;

        setNome(dados.usuario.nome);
        setCrp(`${perfil.crpNumero}/${perfil.crpUf}`);
        setStatus(perfil.status);

        setFormulario({
          telefone: perfil.telefone || "",
          especialidade: perfil.especialidade || "",
          biografia: perfil.biografia || "",
          valorConsulta: perfil.valorConsulta || "",
          cep: endereco?.cep || "",
          logradouro: endereco?.logradouro || "",
          numero: endereco?.numero || "",
          complemento: endereco?.complemento || "",
          bairro: endereco?.bairro || "",
          cidade: endereco?.cidade || "",
          uf: endereco?.uf || "",
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setErro(
          error instanceof Error
            ? error.message
            : "Erro inesperado ao carregar o perfil."
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
  // ATUALIZAR CAMPOS
  // ========================================

  function atualizarCampo(
    campo: keyof Formulario,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  // ========================================
  // SALVAR ALTERAÇÕES
  // ========================================

  async function salvarAlteracoes(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (salvando) return;

    if (
      status === "SUSPENSO" ||
      status === "REJEITADO" ||
      status === ""
    ) {
      setErro("Este perfil não pode ser editado.");
      return;
    }

    setErro("");
    setSucesso("");

    const telefone = formulario.telefone.replace(/\D/g, "");
    const cep = formulario.cep.replace(/\D/g, "");

    const valorConsulta = formulario.valorConsulta
      .trim()
      .replace(",", ".");

    if (!/^\d{10,11}$/.test(telefone)) {
      setErro("Informe um telefone válido com DDD.");
      return;
    }

    if (
      !/^\d{1,8}(\.\d{1,2})?$/.test(valorConsulta) ||
      Number(valorConsulta) <= 0
    ) {
      setErro("Informe um valor de consulta válido.");
      return;
    }

    if (!/^\d{8}$/.test(cep)) {
      setErro("Informe um CEP válido.");
      return;
    }

    if (
      !formulario.logradouro.trim() ||
      !formulario.numero.trim() ||
      !formulario.bairro.trim() ||
      !formulario.cidade.trim()
    ) {
      setErro("Preencha os campos obrigatórios do endereço.");
      return;
    }

    if (!/^[A-Za-z]{2}$/.test(formulario.uf.trim())) {
      setErro("Informe uma UF válida.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/api/psicologos/me`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telefone,
            especialidade: formulario.especialidade.trim(),
            biografia: formulario.biografia.trim(),
            valorConsulta,
            endereco: {
              cep,
              logradouro: formulario.logradouro.trim(),
              numero: formulario.numero.trim(),
              complemento: formulario.complemento.trim(),
              bairro: formulario.bairro.trim(),
              cidade: formulario.cidade.trim(),
              uf: formulario.uf.trim().toUpperCase(),
            },
          }),
        }
      );

      if (resposta.status === 401) {
        router.replace("/login");
        return;
      }

      const dados = await resposta.json();

      if (!resposta.ok || !dados.success) {
        throw new Error(
          dados.message ||
            "Não foi possível salvar as alterações."
        );
      }

      setSucesso(
        "Perfil profissional atualizado com sucesso!"
      );

      setTimeout(() => {
        router.push("/psicologo/perfil");
        router.refresh();
      }, 1200);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao salvar as alterações."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // CARREGAMENTO
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
            Carregando informações profissionais...
          </p>
        </div>
      </main>
    );
  }

  const podeEditar =
    status !== "SUSPENSO" &&
    status !== "REJEITADO" &&
    status !== "";

  // ========================================
  // INTERFACE SERENVIA
  // ========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* NAVEGAÇÃO */}

        <Link
          href="/psicologo/perfil"
          className="inline-flex items-center text-sm font-semibold text-teal-800 transition hover:text-teal-950"
        >
          ← Voltar ao perfil
        </Link>

        {/* AVISO DEMONSTRATIVO */}

        <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
              Ambiente demonstrativo
            </span>

            <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              Projeto de portfólio
            </span>
          </div>

          <p className="mt-4 text-sm leading-7 text-violet-900">
            O SERENVIA é uma plataforma demonstrativa
            desenvolvida pela AW TECHNOLOGY.
            Os perfis profissionais e registros apresentados
            neste ambiente são fictícios.
          </p>

          <p className="mt-2 text-xs leading-6 text-violet-800">
            Não há validação oficial de CRP nem realização
            de atendimentos psicológicos reais.
          </p>
        </section>

        {/* CABEÇALHO */}

        <header className="mt-6 rounded-3xl bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-800 p-8 text-white shadow-sm sm:p-10">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
            SERENVIA • Área profissional
          </span>

          <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
            Editar perfil profissional
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-teal-50">
            Atualize as informações do seu perfil
            profissional no SERENVIA.
          </p>

          <p className="mt-3 text-sm text-teal-100">
            Um caminho para o bem-estar emocional.
          </p>
        </header>

        {/* IDENTIFICAÇÃO */}

        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-xl font-bold">
            Identificação profissional
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Informações vinculadas ao cadastro.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#faf9f6] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nome completo
              </p>

              <p className="mt-2 font-medium">
                {nome || "Não informado"}
              </p>
            </div>

            <div className="rounded-xl bg-[#faf9f6] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {`Registro CRP ${
                  process.env.NEXT_PUBLIC_APP_MODE === "demo"
                    ? "(fictício)"
                    : "informado"
                }`}
              </p>

              <p className="mt-2 font-medium">
                {crp || "Não informado"}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm text-amber-800">
            O registro profissional não pode ser alterado
            por este formulário.
          </p>
        </section>

        {/* BLOQUEIO */}

        {!podeEditar && !erro && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            A edição deste perfil está indisponível
            devido à situação atual do cadastro.
          </div>
        )}

        {/* ERRO */}

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            {erro}
          </div>
        )}

        {/* SUCESSO */}

        {sucesso && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"
          >
            {sucesso}
          </div>
        )}

        {/* FORMULÁRIO */}

        {podeEditar && (
          <form
            onSubmit={salvarAlteracoes}
            className="mt-8 space-y-6"
          >
            {/* INFORMAÇÕES PROFISSIONAIS */}

            <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
              <h2 className="text-xl font-bold">
                Informações profissionais
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Mantenha as informações do perfil atualizadas.
              </p>

              <div className="mt-6 grid gap-5">
                <CampoFormulario
                  id="telefone"
                  titulo="Telefone com DDD"
                  valor={formulario.telefone}
                  alterar={(valor) =>
                    atualizarCampo("telefone", valor)
                  }
                  obrigatorio
                  maxLength={20}
                  placeholder="Ex.: 11999999999"
                />

                <CampoFormulario
                  id="especialidade"
                  titulo="Especialidade"
                  valor={formulario.especialidade}
                  alterar={(valor) =>
                    atualizarCampo("especialidade", valor)
                  }
                  maxLength={200}
                  placeholder="Ex.: Psicologia clínica"
                />

                <CampoFormulario
                  id="valorConsulta"
                  titulo="Valor da consulta (R$)"
                  valor={formulario.valorConsulta}
                  alterar={(valor) =>
                    atualizarCampo("valorConsulta", valor)
                  }
                  obrigatorio
                  maxLength={11}
                  placeholder="Ex.: 150.00"
                />

                <div>
                  <label
                    htmlFor="biografia"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Biografia profissional
                  </label>

                  <textarea
                    id="biografia"
                    rows={6}
                    maxLength={5000}
                    value={formulario.biografia}
                    onChange={(evento) =>
                      atualizarCampo(
                        "biografia",
                        evento.target.value
                      )
                    }
                    placeholder="Descreva a experiência e a abordagem profissional do perfil fictício."
                    className="w-full resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                  />

                  <p className="mt-2 text-right text-xs text-slate-500">
                    {formulario.biografia.length}/5000
                  </p>
                </div>
              </div>
            </section>

            {/* ENDEREÇO */}

            <section className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
              <h2 className="text-xl font-bold">
                Endereço profissional
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Atualize os dados de localização
                cadastrados para este perfil.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <CampoFormulario
                  id="cep"
                  titulo="CEP"
                  valor={formulario.cep}
                  alterar={(valor) =>
                    atualizarCampo("cep", valor)
                  }
                  obrigatorio
                  maxLength={9}
                  placeholder="00000-000"
                />

                <CampoFormulario
                  id="uf"
                  titulo="Estado (UF)"
                  valor={formulario.uf}
                  alterar={(valor) =>
                    atualizarCampo(
                      "uf",
                      valor.toUpperCase()
                    )
                  }
                  obrigatorio
                  maxLength={2}
                  placeholder="SP"
                />

                <div className="sm:col-span-2">
                  <CampoFormulario
                    id="logradouro"
                    titulo="Logradouro"
                    valor={formulario.logradouro}
                    alterar={(valor) =>
                      atualizarCampo("logradouro", valor)
                    }
                    obrigatorio
                    maxLength={200}
                    placeholder="Rua ou avenida"
                  />
                </div>

                <CampoFormulario
                  id="numero"
                  titulo="Número"
                  valor={formulario.numero}
                  alterar={(valor) =>
                    atualizarCampo("numero", valor)
                  }
                  obrigatorio
                  maxLength={200}
                />

                <CampoFormulario
                  id="complemento"
                  titulo="Complemento"
                  valor={formulario.complemento}
                  alterar={(valor) =>
                    atualizarCampo("complemento", valor)
                  }
                  maxLength={200}
                  placeholder="Opcional"
                />

                <CampoFormulario
                  id="bairro"
                  titulo="Bairro"
                  valor={formulario.bairro}
                  alterar={(valor) =>
                    atualizarCampo("bairro", valor)
                  }
                  obrigatorio
                  maxLength={200}
                />

                <CampoFormulario
                  id="cidade"
                  titulo="Cidade"
                  valor={formulario.cidade}
                  alterar={(valor) =>
                    atualizarCampo("cidade", valor)
                  }
                  obrigatorio
                  maxLength={200}
                />
              </div>
            </section>

            {/* AÇÕES */}

            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-teal-800 px-7 py-3 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {salvando
                  ? "Salvando alterações..."
                  : "Salvar alterações"}
              </button>

              <Link
                href="/psicologo/perfil"
                className="rounded-xl border border-stone-300 bg-white px-7 py-3 font-semibold text-slate-700 transition hover:bg-stone-100"
              >
                Cancelar
              </Link>
            </div>
          </form>
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

          <p className="mt-2 text-xs leading-6 text-slate-500">
            Perfis fictícios • Sem validação oficial de CRP •
            Sem atendimento psicológico real
          </p>
        </footer>
      </div>
    </main>
  );
}