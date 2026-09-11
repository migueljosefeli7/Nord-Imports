import { AuthForm } from "@/components/auth-form";

export default async function Login({ searchParams }: { searchParams: Promise<{ retorno?: string }> }) {
  const { retorno } = await searchParams;
  const returnTo = retorno?.startsWith("/") && !retorno.startsWith("//") ? retorno : "/admin";
  return <AuthForm mode="login" returnTo={returnTo} />;
}
