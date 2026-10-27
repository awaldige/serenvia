"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TipoUsuario = "PACIENTE" | "PSICOLOGO" | "ADMIN";

type RespostaLogin = {
  success: boolean;
  message?: string;
  usuario?: {
    id: string;
    nome: string;
    email: string;
    tipo: TipoUsuario;
    statusPsicologo?: string | null;
  };
};

const API_URL = "";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ==========================================
  // REALIZAR LOGIN
  // ==========================================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (carregando) return;

    setErro("");
    setSucesso("");

    if (!email.trim() || !senha) {
      setErro("Informe seu e-mail e sua senha.");
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            senha,
          }),
        }
      );

      const dados: RespostaLogin = await resposta.json();

      if (!resposta.ok || !dados.success) {
        throw new Error(
          dados.message || "Não foi possível realizar o login."
        );
      }

      if (!dados.usuario) {
        throw new Error(
          "Não foi possível identificar o usuário autenticado."
        );
      }

      let destino: string;

      // ======================================
      // REDIRECIONAMENTO POR TIPO DE USUÁRIO
      // ======================================

      switch (dados.usuario.tipo) {
        case "PACIENTE":
          destino = "/paciente";
          break;

        case "PSICOLOGO":
          destino = "/psicologo";
          break;

        case "ADMIN":
          destino = "/admin";
          break;

        default:
          throw new Error("Tipo de usuário não reconhecido.");
      }

      setSucesso("Login realizado com sucesso!");
      setSenha("");

      router.replace(destino);
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível conectar ao servidor."
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
            className="text-xl font-semibold tracking-tight text-teal-800 sm:text-2xl"
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
            SERENVIA • Acesso à plataforma
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Bem-vindo de volta
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Entre na sua conta para acessar seu espaço
            no Serenvia.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Pacientes, psicólogos e administradores podem
            utilizar o mesmo formulário de acesso.
          </p>

          {/* AVISO DEMONSTRATIVO */}

          <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-violet-900">
              Ambiente demonstrativo
            </p>

            <p className="mt-2 text-xs leading-6 text-violet-800">
              O Serenvia é um projeto de portfólio.
              Os perfis profissionais são fictícios,
              as aprovações são simuladas e não são
              realizados atendimentos psicológicos reais.
            </p>
          </div>

          {/* ======================================
              FORMULÁRIO DE LOGIN
          ====================================== */}

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
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

              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(event) => {
                    setSenha(event.target.value);
                    setErro("");
                  }}
                  autoComplete="current-password"
                  required
                  placeholder="Digite sua senha"
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 pr-24 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarSenha(!mostrarSenha)
                  }
                  aria-label={
                    mostrarSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  aria-pressed={mostrarSenha}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-teal-800 transition hover:text-teal-950"
                >
                  {mostrarSenha
                    ? "Ocultar"
                    : "Mostrar"}
                </button>
              </div>
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
              </div>
            )}

            {/* BOTÃO ENTRAR */}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-teal-800 px-6 py-3.5 font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando
                ? "Entrando..."
                : "Entrar na minha conta"}
            </button>
          </form>

          {/* ======================================
              OPÇÕES DE CADASTRO
          ====================================== */}

          <div className="mt-8 border-t border-stone-200 pt-7">
            <h2 className="text-center text-base font-semibold">
              Ainda não possui uma conta?
            </h2>

            <p className="mt-2 text-center text-sm text-slate-600">
              Escolha como deseja participar do Serenvia.
            </p>

            <div className="mt-6 grid gap-3">
              {/* CADASTRO PACIENTE */}

              <Link
                href="/cadastro"
                className="flex items-center justify-center rounded-xl border border-teal-700 px-5 py-3 font-medium text-teal-800 transition hover:bg-teal-50"
              >
                Criar conta como paciente
              </Link>

              {/* CADASTRO PSICÓLOGO */}

              <Link
                href="/cadastro-psicologo"
                className="flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 font-medium text-slate-700 transition hover:bg-stone-50"
              >
                Cadastrar-me como psicólogo
              </Link>
            </div>
          </div>

          {/* ======================================
              INFORMAÇÕES DE SEGURANÇA
          ====================================== */}

          <div className="mt-8 rounded-2xl bg-[#f8f7f4] p-5">
            <p className="text-center text-xs leading-6 text-slate-600">
              Seus dados de acesso são utilizados para
              autenticação na plataforma. O cadastro
              profissional passa por análise administrativa
              simulada neste ambiente demonstrativo.
              Nenhum registro profissional é validado
              oficialmente.
            </p>
          </div>

          {/* RODAPÉ DO FORMULÁRIO */}

          <p className="mt-8 text-center text-xs text-slate-500">
            SERENVIA — Um caminho para o bem-estar emocional.
          </p>
        </div>
      </section>
    </main>
  );
}