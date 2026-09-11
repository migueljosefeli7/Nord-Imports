"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { supabaseBrowser } from "@/lib/supabase";

export function AuthForm({ mode, returnTo = "/admin" }: { mode: "login" | "signup"; returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage(""); setLoading(true);
    try {
      const s = supabaseBrowser();
      const callback = `${location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;
      const { data, error } = isLogin ? await s.auth.signInWithPassword({ email, password }) : await s.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
      if (error) throw error;
      location.href = isLogin || data.session ? returnTo : "/auth/sucesso";
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível continuar. Verifique os dados e tente novamente."); setLoading(false);
    }
  }

  return <main className="auth-page"><Link href="/" aria-label="Voltar para a Nord Imports"><BrandLogo className="header-logo" /></Link>
    <form onSubmit={submit} className="auth-card" aria-busy={loading}>
      <div><p className="eyebrow">ÁREA RESTRITA</p><h1>{isLogin ? "Acessar painel" : "Criar conta"}</h1><p>{isLogin ? "Entre com sua conta administrativa." : "Cadastre-se para solicitar acesso ao painel."}</p></div>
      {message && <div className="form-error" role="alert">{message}</div>}
      <label htmlFor="email">E-mail<input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label htmlFor="password">Senha<div className="password-field"><input id="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} aria-describedby="password-help" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div><small id="password-help">Mínimo de 6 caracteres.</small></label>
      <button className="button primary" disabled={loading}>{loading ? <><LoaderCircle className="spin" aria-hidden="true" /> AGUARDE…</> : isLogin ? "ENTRAR" : "CADASTRAR"}</button>
      <Link href={isLogin ? "/cadastro" : "/login"}>{isLogin ? "Ainda não tenho uma conta" : "Já tenho uma conta"}</Link>
    </form>
  </main>;
}
