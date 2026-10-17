"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ==========================================
// TIPOS
// ==========================================

type DadosFormulario = {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  crpNumero: string;
  crpUf: string;
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

type RespostaApi = {
  success: boolean;
  message?: string;
};

type RespostaCep = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

// ==========================================
// DADOS INICIAIS
// ==========================================

const dadosIniciais: DadosFormulario = {
  nome: "",
  email: "",
  telefone: "",
  senha: "",
  confirmarSenha: "",
  crpNumero: "",
  crpUf: "",
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

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF",
  "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS",
  "RO", "RR", "SC", "SP", "SE", "TO",
];

const estiloCampo =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100";

const estiloLabel =
  "block text-sm font-medium text-slate-700";

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function CadastroPsicologoPage() {
  const [dados, setDados] =
    useState<DadosFormulario>(dadosIniciais);

  const [enviando, setEnviando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [erro, setErro] = useState("");
  const [erroCep, setErroCep] = useState("");

  const [sucesso, setSucesso] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ==========================================
  // ATUALIZAR CAMPOS
  // ==========================================

  function atualizarCampo(
    campo: keyof DadosFormulario,
    valor: string
  ) {
    setDados((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setErro("");

    if (campo === "cep") {
      setErroCep("");
    }
  }

  // ==========================================
  // CONSULTAR CEP
  // ==========================================

  async function consultarCep() {
    const cepLimpo = dados.cep.replace(/\D/g, "");

    if (!/^\d{8}$/.test(cepLimpo)) {
      setErroCep("Informe um CEP com 8 números.");
      return;
    }

    if (buscandoCep) return;

    setBuscandoCep(true);
    setErroCep("");

    try {
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );

      if (!resposta.ok) {
        throw new Error("Não foi possível consultar o CEP.");
      }

      const endereco: RespostaCep = await resposta.json();

      if (endereco.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }

      setDados((anterior) => {
        // Evita preencher endereço de outro CEP
        // caso o usuário tenha alterado o campo.
        if (
          anterior.cep.replace(/\D/g, "") !== cepLimpo
        ) {
          return anterior;
        }

        return {
          ...anterior,
          logradouro: endereco.logradouro || "",
          bairro: endereco.bairro || "",
          cidade: endereco.localidade || "",
          uf: endereco.uf || "",
        };
      });
    } catch {
      setErroCep(
        "Erro ao buscar o CEP. Tente novamente."
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  // ==========================================
  // ENVIAR CADASTRO
  // ==========================================

  async function aoEnviar(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (enviando) return;

    setErro("");

    // ======================================
    // VALIDAR SENHAS
    // ======================================

    if (dados.senha !== dados.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (
      dados.senha.length < 8 ||
      dados.senha.length > 72
    ) {
      setErro(
        "A senha deve ter entre 8 e 72 caracteres."
      );
      return;
    }

    // ======================================
    // VALIDAR VALOR DEMONSTRATIVO
    // ======================================

    const valorConsulta = Number(dados.valorConsulta);

    if (
      !Number.isFinite(valorConsulta) ||
      valorConsulta <= 0
    ) {
      setErro(
        "Informe um valor demonstrativo de consulta válido."
      );
      return;
    }

    // ======================================
    // VALIDAR CEP
    // ======================================

    const cepLimpo = dados.cep.replace(/\D/g, "");

    if (!/^\d{8}$/.test(cepLimpo)) {
      setErro("Informe um CEP válido.");
      return;
    }

    // ======================================
    // ENVIAR AO BACKEND
    // ======================================

    setEnviando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/api/psicologos/cadastro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: dados.nome.trim(),
            email: dados.email.trim().toLowerCase(),
            telefone: dados.telefone.trim(),
            senha: dados.senha,
            crpNumero: dados.crpNumero.trim(),
            crpUf: dados.crpUf,
            especialidade: dados.especialidade.trim(),
            biografia: dados.biografia.trim(),
            valorConsulta,
            endereco: {
              cep: cepLimpo,
              logradouro: dados.logradouro.trim(),
              numero: dados.numero.trim(),
              complemento: dados.complemento.trim(),
              bairro: dados.bairro.trim(),
              cidade: dados.cidade.trim(),
              uf: dados.uf,
            },
          }),
        }
      );

      const resultado: RespostaApi =
        await resposta.json();

      if (!resposta.ok || !resultado.success) {
        throw new Error(
          resultado.message ||
            "Erro ao realizar cadastro."
        );
      }

      setSucesso(true);
      setDados(dadosIniciais);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Ocorreu um erro inesperado.");
      }
    } finally {
      setEnviando(false);
    }
  }

  // ==========================================
  // TELA DE SUCESSO
  // ==========================================

  if (sucesso) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            SEREN
            <span className="text-teal-600">
              VIA
            </span>
          </Link>

          <div className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl text-teal-800">
            ✓
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-slate-800">
            Cadastro realizado!
          </h1>

          <p className="mt-4 leading-7 text-slate-600">
            Seu cadastro demonstrativo foi enviado
            com sucesso e ficará disponível para
            análise administrativa simulada.
          </p>

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-left">
            <p className="text-sm font-semibold text-violet-900">
              Importante
            </p>

            <p className="mt-2 text-sm leading-6 text-violet-800">
              O Serenvia é um projeto de portfólio.
              A aprovação administrativa é simulada
              e não representa validação oficial
              do registro profissional no CRP.
              Não são realizados atendimentos reais.
            </p>
          </div>

          <Link
            href="/login"
            className="mt-8 inline-block rounded-full bg-teal-800 px-7 py-3 font-semibold text-white transition hover:bg-teal-900"
          >
            Ir para o login
          </Link>

          <p className="mt-8 text-xs text-slate-500">
            SERENVIA — Um caminho para o bem-estar emocional.
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // FORMULÁRIO
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">
      {/* CABEÇALHO */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
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
            href="/"
            className="text-sm font-medium text-teal-800 transition hover:text-teal-950"
          >
            Voltar ao início
          </Link>
        </div>
      </header>

      {/* CONTEÚDO */}

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">

          {/* APRESENTAÇÃO */}

          <div className="mb-8">
            <span className="inline-block rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-900">
              SERENVIA • Cadastro profissional
            </span>

            <h1 className="mt-6 text-3xl font-semibold tracking-tight">
              Cadastro de psicólogo
            </h1>

            <p className="mt-3 leading-7 text-slate-600">
              Preencha as informações abaixo para
              criar um perfil profissional demonstrativo
              na plataforma Serenvia.
            </p>
          </div>

          {/* AVISO DEMONSTRATIVO */}

          <div className="mb-8 rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-900">
              Ambiente demonstrativo
            </p>

            <p className="mt-2 text-sm leading-6 text-violet-800">
              Este formulário integra um projeto
              de portfólio desenvolvido pela
              AW TECHNOLOGY. Utilize apenas
              informações fictícias para demonstração.
              Os registros CRP não são verificados
              oficialmente, e a análise administrativa
              é simulada.
            </p>
          </div>

          {/* MENSAGEM DE ERRO */}

          {erro && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {erro}
            </div>
          )}

          {/* FORMULÁRIO */}

          <form
            onSubmit={aoEnviar}
            className="space-y-8"
          >
            {/* ======================================
                INFORMAÇÕES PESSOAIS
            ====================================== */}

            <div className="space-y-4">
              <h2 className="border-b border-stone-200 pb-3 text-lg font-semibold">
                Informações pessoais
              </h2>

              <div>
                <label
                  htmlFor="nome"
                  className={estiloLabel}
                >
                  Nome completo
                </label>

                <input
                  id="nome"
                  type="text"
                  required
                  minLength={3}
                  maxLength={150}
                  value={dados.nome}
                  onChange={(e) =>
                    atualizarCampo("nome", e.target.value)
                  }
                  className={estiloCampo}
                  placeholder="Nome fictício para demonstração"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="email"
                    className={estiloLabel}
                  >
                    E-mail
                  </label>

                  <input
                    id="email"
                    type="email"
                    required
                    maxLength={254}
                    value={dados.email}
                    onChange={(e) =>
                      atualizarCampo("email", e.target.value)
                    }
                    className={estiloCampo}
                    placeholder="exemplo@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="telefone"
                    className={estiloLabel}
                  >
                    Telefone / WhatsApp
                  </label>

                  <input
                    id="telefone"
                    type="text"
                    required
                    value={dados.telefone}
                    onChange={(e) =>
                      atualizarCampo("telefone", e.target.value)
                    }
                    className={estiloCampo}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              {/* SENHAS */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="senha"
                    className={estiloLabel}
                  >
                    Senha
                  </label>

                  <input
                    id="senha"
                    type={
                      mostrarSenha
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={dados.senha}
                    onChange={(e) =>
                      atualizarCampo("senha", e.target.value)
                    }
                    className={estiloCampo}
                    placeholder="8 a 72 caracteres"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmarSenha"
                    className={estiloLabel}
                  >
                    Confirmar senha
                  </label>

                  <input
                    id="confirmarSenha"
                    type={
                      mostrarSenha
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={dados.confirmarSenha}
                    onChange={(e) =>
                      atualizarCampo(
                        "confirmarSenha",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mostrarSenha"
                  checked={mostrarSenha}
                  onChange={(e) =>
                    setMostrarSenha(e.target.checked)
                  }
                  className="rounded border-stone-300 text-teal-700 focus:ring-teal-500"
                />

                <label
                  htmlFor="mostrarSenha"
                  className="cursor-pointer text-sm text-slate-600"
                >
                  Mostrar senhas
                </label>
              </div>
            </div>

            {/* ======================================
                DADOS PROFISSIONAIS
            ====================================== */}

            <div className="space-y-4">
              <h2 className="border-b border-stone-200 pb-3 text-lg font-semibold">
                Dados profissionais demonstrativos
              </h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="crpNumero"
                    className={estiloLabel}
                  >
                    Número do CRP fictício
                  </label>

                  <input
                    id="crpNumero"
                    type="text"
                    required
                    value={dados.crpNumero}
                    onChange={(e) =>
                      atualizarCampo(
                        "crpNumero",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Registro fictício para teste"
                  />
                </div>

                <div>
                  <label
                    htmlFor="crpUf"
                    className={estiloLabel}
                  >
                    CRP UF
                  </label>

                  <select
                    id="crpUf"
                    required
                    value={dados.crpUf}
                    onChange={(e) =>
                      atualizarCampo("crpUf", e.target.value)
                    }
                    className={estiloCampo}
                  >
                    <option value="">
                      Selecione
                    </option>

                    {estados.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="especialidade"
                    className={estiloLabel}
                  >
                    Especialidade principal
                  </label>

                  <input
                    id="especialidade"
                    type="text"
                    required
                    value={dados.especialidade}
                    onChange={(e) =>
                      atualizarCampo(
                        "especialidade",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Ex.: Psicologia Clínica"
                  />
                </div>

                <div>
                  <label
                    htmlFor="valorConsulta"
                    className={estiloLabel}
                  >
                    Valor demonstrativo (R$)
                  </label>

                  <input
                    id="valorConsulta"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={dados.valorConsulta}
                    onChange={(e) =>
                      atualizarCampo(
                        "valorConsulta",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Ex.: 150.00"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="biografia"
                  className={estiloLabel}
                >
                  Biografia / Apresentação
                </label>

                <textarea
                  id="biografia"
                  rows={5}
                  required
                  value={dados.biografia}
                  onChange={(e) =>
                    atualizarCampo(
                      "biografia",
                      e.target.value
                    )
                  }
                  className={estiloCampo}
                  placeholder="Descreva uma apresentação profissional fictícia..."
                />
              </div>
            </div>

            {/* ======================================
                ENDEREÇO
            ====================================== */}

            <div className="space-y-4">
              <h2 className="border-b border-stone-200 pb-3 text-lg font-semibold">
                Endereço demonstrativo
              </h2>

              <p className="text-sm leading-6 text-slate-600">
                Utilize dados fictícios de endereço.
                A consulta de CEP serve apenas
                para demonstrar o preenchimento
                automático dos campos.
              </p>

              {/* CEP */}

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="cep"
                    className={estiloLabel}
                  >
                    CEP
                  </label>

                  <input
                    id="cep"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={9}
                    value={dados.cep}
                    onChange={(e) =>
                      atualizarCampo("cep", e.target.value)
                    }
                    onBlur={() => {
                      if (dados.cep.trim()) {
                        void consultarCep();
                      }
                    }}
                    className={estiloCampo}
                    placeholder="00000-000"
                  />

                  {erroCep && (
                    <p
                      role="alert"
                      className="mt-2 text-xs text-red-600"
                    >
                      {erroCep}
                    </p>
                  )}
                </div>

                <div className="flex items-end sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => void consultarCep()}
                    disabled={buscandoCep}
                    className="w-full rounded-xl bg-stone-200 px-5 py-3 font-medium text-slate-700 transition hover:bg-stone-300 disabled:opacity-50 sm:w-auto"
                  >
                    {buscandoCep
                      ? "Buscando..."
                      : "Buscar CEP"}
                  </button>
                </div>
              </div>

              {/* LOGRADOURO E NÚMERO */}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="logradouro"
                    className={estiloLabel}
                  >
                    Logradouro
                  </label>

                  <input
                    id="logradouro"
                    type="text"
                    required
                    value={dados.logradouro}
                    onChange={(e) =>
                      atualizarCampo(
                        "logradouro",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Rua, avenida etc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="numero"
                    className={estiloLabel}
                  >
                    Número
                  </label>

                  <input
                    id="numero"
                    type="text"
                    required
                    value={dados.numero}
                    onChange={(e) =>
                      atualizarCampo(
                        "numero",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="123"
                  />
                </div>
              </div>

              {/* COMPLEMENTO, BAIRRO E CIDADE */}

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="complemento"
                    className={estiloLabel}
                  >
                    Complemento
                  </label>

                  <input
                    id="complemento"
                    type="text"
                    value={dados.complemento}
                    onChange={(e) =>
                      atualizarCampo(
                        "complemento",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Sala, apartamento etc."
                  />
                </div>

                <div>
                  <label
                    htmlFor="bairro"
                    className={estiloLabel}
                  >
                    Bairro
                  </label>

                  <input
                    id="bairro"
                    type="text"
                    required
                    value={dados.bairro}
                    onChange={(e) =>
                      atualizarCampo(
                        "bairro",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Bairro"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cidade"
                    className={estiloLabel}
                  >
                    Cidade
                  </label>

                  <input
                    id="cidade"
                    type="text"
                    required
                    value={dados.cidade}
                    onChange={(e) =>
                      atualizarCampo(
                        "cidade",
                        e.target.value
                      )
                    }
                    className={estiloCampo}
                    placeholder="Cidade"
                  />
                </div>
              </div>

              {/* UF */}

              <div>
                <label
                  htmlFor="uf"
                  className={estiloLabel}
                >
                  UF
                </label>

                <select
                  id="uf"
                  required
                  value={dados.uf}
                  onChange={(e) =>
                    atualizarCampo("uf", e.target.value)
                  }
                  className={estiloCampo}
                >
                  <option value="">
                    Selecione
                  </option>

                  {estados.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ======================================
                BOTÃO FINALIZAR
            ====================================== */}

            <div className="border-t border-stone-200 pt-8">
              <button
                type="submit"
                disabled={enviando || buscandoCep}
                className="w-full rounded-xl bg-teal-800 px-6 py-4 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando
                  ? "Enviando cadastro..."
                  : "Finalizar cadastro demonstrativo"}
              </button>
            </div>
          </form>

          {/* LOGIN */}

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              Já possui uma conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-teal-800 hover:underline"
              >
                Faça login
              </Link>
            </p>
          </div>

          {/* RODAPÉ */}

          <div className="mt-8 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm font-semibold text-teal-800">
              SERENVIA
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Um caminho para o bem-estar emocional.
            </p>

            <p className="mt-3 text-xs text-slate-400">
              Projeto demonstrativo desenvolvido
              por AW TECHNOLOGY.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}