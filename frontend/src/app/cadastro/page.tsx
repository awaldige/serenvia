"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_URL = "";

// ==========================================
// TIPOS
// ==========================================

type RespostaCadastro = {
  success: boolean;
  message?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };
};

// ==========================================
// PÁGINA DE CADASTRO DE PACIENTES
// ==========================================

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ==========================================
  // ENVIAR CADASTRO
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (carregando) return;

    setErro("");
    setSucesso("");

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    // VALIDAR NOME

    if (nomeLimpo.length < 3 || nomeLimpo.length > 150) {
      setErro("O nome deve ter entre 3 e 150 caracteres.");
      return;
    }

    // VALIDAR E-MAIL

    if (
      emailLimpo.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
    ) {
      setErro("Informe um e-mail válido.");
      return;
    }

    // VALIDAR SENHA

    if (senha.length < 8 || senha.length > 72) {
      setErro("A senha deve ter entre 8 e 72 caracteres.");
      return;
    }

    // CONFIRMAR SENHA

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    // ==========================================
    // ENVIAR DADOS AO BACKEND
    // ==========================================

    setCarregando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/api/pacientes/cadastro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nome: nomeLimpo,
            email: emailLimpo,
            senha,
            confirmarSenha,
          }),
        }
      );

      const dados: RespostaCadastro = await resposta.json();

      if (!resposta.ok || !dados.success) {
        setErro(
          dados.message || "Não foi possível realizar o cadastro."
        );
        return;
      }

      // ==========================================
      // CADASTRO REALIZADO
      // ==========================================

      setSucesso(
        "Cadastro realizado com sucesso! Sua conta demonstrativa foi criada."
      );

      setNome("");
      setEmail("");
      setSenha("");
      setConfirmarSenha("");
    } catch {
      setErro(
        "Não foi possível conectar ao servidor. Verifique se o backend está funcionando."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f4] text-slate-800">
      {/* ======================================
          CABEÇALHO SERENVIA
      ====================================== */}

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-teal-800"
          >
            SEREN<span className="text-teal-600">VIA</span>
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-teal-800 transition hover:text-teal-950"
          >
            Voltar ao início
          </Link>
        </div>
      </header>

      {/* ======================================
          CONTEÚDO PRINCIPAL
      ====================================== */}

      <section className="mx-auto flex max-w-6xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-10">

          {/* IDENTIFICAÇÃO */}

          <span className="inline-block rounded-full bg-teal-100 px-4 py-2 text-sm font-medium text-teal-900">
            SERENVIA • Cadastro de paciente
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Comece sua jornada no Serenvia
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Crie sua conta para explorar a plataforma,
            conhecer perfis profissionais fictícios e
            descobrir como funciona a experiência digital
            de organização de consultas.
          </p>

          {/* ======================================
              AVISO DEMONSTRATIVO
          ====================================== */}

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5">
            <p className="text-sm font-semibold text-violet-900">
              Ambiente demonstrativo
            </p>

            <p className="mt-2 text-xs leading-6 text-violet-800">
              O Serenvia é um projeto de portfólio
              desenvolvido pela AW TECHNOLOGY.
              Os profissionais apresentados são fictícios,
              e não são realizados atendimentos psicológicos reais.
            </p>
          </div>

          {/* ======================================
              FORMULÁRIO
          ====================================== */}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            {/* NOME */}

            <div>
              <label
                htmlFor="nome"
                className="mb-2 block text-sm font-medium"
              >
                Nome completo
              </label>

              <input
                id="nome"
                type="text"
                value={nome}
                onChange={(event) => {
                  setNome(event.target.value);
                  setErro("");
                }}
                autoComplete="name"
                required
                minLength={3}
                maxLength={150}
                placeholder="Digite seu nome completo"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* E-MAIL */}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                E-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErro("");
                }}
                autoComplete="email"
                required
                maxLength={254}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* SENHA */}

            <div>
              <label
                htmlFor="senha"
                className="mb-2 block text-sm font-medium"
              >
                Senha
              </label>

              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(event) => {
                  setSenha(event.target.value);
                  setErro("");
                }}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                placeholder="Mínimo de 8 caracteres"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Utilize entre 8 e 72 caracteres.
                Você pode combinar letras, números e símbolos.
              </p>
            </div>

            {/* CONFIRMAR SENHA */}

            <div>
              <label
                htmlFor="confirmarSenha"
                className="mb-2 block text-sm font-medium"
              >
                Confirmar senha
              </label>

              <input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={(event) => {
                  setConfirmarSenha(event.target.value);
                  setErro("");
                }}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                placeholder="Digite a senha novamente"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* ======================================
                MENSAGENS
            ====================================== */}

            {erro && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {erro}
              </div>
            )}

            {sucesso && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                {sucesso}

                <p className="mt-2">
                  Agora você pode{" "}
                  <Link
                    href="/login"
                    className="font-semibold underline"
                  >
                    entrar na sua conta
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* ======================================
                BOTÃO CRIAR CONTA
            ====================================== */}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-teal-800 px-6 py-3.5 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando
                ? "Criando conta..."
                : "Criar minha conta"}
            </button>
          </form>

          {/* ======================================
              ACESSO AO LOGIN
          ====================================== */}

          <p className="mt-6 text-center text-sm text-slate-600">
            Já possui uma conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-teal-800 hover:underline"
            >
              Entrar
            </Link>
          </p>

          {/* ======================================
              RODAPÉ DO FORMULÁRIO
          ====================================== */}

          <div className="mt-8 border-t border-stone-200 pt-6 text-center">
            <p className="text-xs font-medium text-teal-800">
              SERENVIA
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Um caminho para o bem-estar emocional.
            </p>

            <p className="mt-3 text-xs text-slate-400">
              Projeto demonstrativo desenvolvido por AW TECHNOLOGY.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}