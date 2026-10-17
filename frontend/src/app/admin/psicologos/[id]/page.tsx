import { Suspense } from "react";
import AnalisePsicologoClient from "./AnalisePsicologoClient";

// ==========================================
// TIPOS
// ==========================================

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// ==========================================
// CONTEÚDO DA ANÁLISE
// ==========================================

async function ConteudoAnalisePsicologo({
  params,
}: PageProps) {
  const { id } = await params;

  return <AnalisePsicologoClient id={id} />;
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function AnalisePsicologoPage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f7f4] px-6">
          <div className="text-center">

            {/* IDENTIDADE SERENVIA */}

            <p className="text-3xl font-semibold tracking-tight text-teal-800">
              SEREN
              <span className="text-teal-600">
                VIA
              </span>
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Um caminho para o bem-estar emocional.
            </p>

            {/* INDICADOR DE CARREGAMENTO */}

            <div className="mx-auto mt-8 h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" />

            <p
              role="status"
              className="mt-6 text-sm font-medium text-slate-600"
            >
              Preparando análise administrativa...
            </p>

            {/* AVISO DEMONSTRATIVO */}

            <p className="mx-auto mt-6 max-w-md text-xs leading-6 text-slate-500">
              Ambiente demonstrativo com perfis fictícios.
              As decisões administrativas são simuladas,
              sem validação oficial do CRP.
            </p>

            <p className="mt-8 text-xs text-slate-400">
              Projeto desenvolvido por AW TECHNOLOGY.
            </p>

          </div>
        </main>
      }
    >
      <ConteudoAnalisePsicologo params={params} />
    </Suspense>
  );
}