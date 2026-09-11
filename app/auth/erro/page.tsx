import Link from "next/link";

export default async function ErrorPage({ searchParams }: { searchParams: Promise<{ mensagem?: string }> }) {
  const { mensagem } = await searchParams;
  return <main className="state-page"><p className="eyebrow">ALGO DEU ERRADO</p><h1>Não conseguimos autenticar.</h1><p>{mensagem || "Tente novamente. Se o problema continuar, revise as configurações do Supabase."}</p><Link className="button primary" href="/login">TENTAR NOVAMENTE</Link></main>;
}
