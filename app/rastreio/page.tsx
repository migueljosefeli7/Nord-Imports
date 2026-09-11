"use client";

import Link from "next/link";
import { ArrowUpRight, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import { FormEvent, useState } from "react";
import { StoreFooter } from "@/components/store-footer";
import { StoreHeader } from "@/components/store-header";

export default function TrackingPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(normalized)) { setError("Confira o código. O formato esperado é AA123456789BR."); return; }
    setError("");
    window.open("https://rastreamento.correios.com.br/app/index.php", "_blank", "noopener,noreferrer");
  }
  return <><StoreHeader /><main id="conteudo" className="tracking-page" tabIndex={-1}>
    <section className="tracking-hero"><p className="eyebrow">ACOMPANHE SUA ENTREGA</p><h1>DA CURADORIA<br /><i>ATÉ SUA CASA.</i></h1><p>Quando sua encomenda estiver no Brasil, consulte cada atualização diretamente no ambiente oficial dos Correios.</p></section>
    <section className="tracking-card">
      <div><PackageSearch aria-hidden="true" /><p className="eyebrow">RASTREAMENTO NACIONAL</p><h2>Digite seu código</h2><p>Você será direcionado ao rastreamento oficial dos Correios para consultar os eventos mais recentes.</p></div>
      <form onSubmit={submit} noValidate><label htmlFor="tracking-code">Código de rastreio</label><input id="tracking-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AA123456789BR" autoComplete="off" maxLength={15} aria-describedby={error ? "tracking-error" : "tracking-help"} /><small id="tracking-help">O código é enviado pela Nord assim que estiver disponível.</small>{error && <p id="tracking-error" role="alert">{error}</p>}<button className="button primary">RASTREAR NOS CORREIOS <ArrowUpRight /></button></form>
    </section>
    <section className="tracking-flow"><article><span>01</span><Truck /><h2>Trajeto internacional</h2><p>A encomenda viaja com uma transportadora parceira até o Brasil.</p></article><article><span>02</span><ShieldCheck /><h2>Rastreamento nacional</h2><p>No Brasil, o percurso é acompanhado pelo código dos Correios.</p></article><article><span>03</span><PackageSearch /><h2>Entrega em casa</h2><p>Você acompanha cada etapa até receber sua escolha.</p></article></section>
    <p className="tracking-help">Ainda tem dúvidas sobre sua entrega? <Link href="/">Fale com a Nord pelo atendimento.</Link></p>
  </main><StoreFooter /></>;
}
