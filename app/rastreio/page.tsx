"use client";

import Link from "next/link";
import { Check, Clock3, MapPin, PackageCheck, PackageSearch, RefreshCw, Route, Search, ShieldCheck, Truck } from "lucide-react";
import { FormEvent, useState } from "react";
import { StoreFooter } from "@/components/store-footer";
import { StoreHeader } from "@/components/store-header";

type TrackingEvent = { id: string; description: string; status: string; origin: string | null; destination: string | null; date: string | null; time: string | null };
type TrackingResult = { code: string; type: string; events: TrackingEvent[]; updatedAt: string };

function EventIcon({ status }: { status: string }) {
  if (status === "delivered") return <Check />;
  if (status === "delivery_route") return <Truck />;
  if (status === "posted") return <PackageCheck />;
  return <Route />;
}

export default function TrackingPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(normalized)) { setError("Confira o código. O formato esperado é AA123456789BR."); setResult(null); return; }
    setError(""); setLoading(true); setResult(null);
    try {
      const response = await fetch(`/api/rastreio?codigo=${encodeURIComponent(normalized)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar a encomenda.");
      setResult(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível consultar a encomenda."); }
    finally { setLoading(false); }
  }

  const latest = result?.events[0];
  const delivered = latest?.status === "delivered";
  return <><StoreHeader /><main id="conteudo" className="tracking-page" tabIndex={-1}>
    <section className="tracking-hero"><p className="eyebrow">ACOMPANHE SUA ENTREGA</p><h1>DA CURADORIA<br /><i>ATÉ SUA CASA.</i></h1><p>Consulte cada movimentação sem sair da Nord. O histórico aparece aqui, organizado do evento mais recente até a postagem.</p></section>
    <section className="tracking-card tracking-card-integrated">
      <div><PackageSearch aria-hidden="true" /><p className="eyebrow">RASTREAMENTO INTEGRADO</p><h2>Onde está sua peça?</h2><p>Digite o código enviado pela Nord para consultar as atualizações da etapa nacional.</p></div>
      <form onSubmit={submit} noValidate><label htmlFor="tracking-code">Código de rastreio</label><div className="tracking-input"><input id="tracking-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AA123456789BR" autoComplete="off" maxLength={15} aria-describedby={error ? "tracking-error" : "tracking-help"} /><Search /></div><small id="tracking-help">São duas letras, nove números e duas letras no final.</small>{error && <p id="tracking-error" role="alert">{error}</p>}<button className="button primary" disabled={loading}>{loading ? <><RefreshCw className="spin" /> CONSULTANDO…</> : <>ACOMPANHAR PEDIDO <Search /></>}</button></form>
    </section>

    {result && latest && <section className="tracking-result" aria-live="polite">
      <header><div><p className="eyebrow">STATUS ATUAL</p><h2>{latest.description}</h2><span><MapPin /> {latest.origin || "Atualização dos Correios"}</span></div><div className={`tracking-status-seal ${delivered ? "delivered" : ""}`}><EventIcon status={latest.status} /><b>{delivered ? "ENTREGUE" : "EM ANDAMENTO"}</b></div></header>
      <div className="tracking-order-meta"><span><small>CÓDIGO</small><b>{result.code}</b></span><span><small>SERVIÇO</small><b>{result.type}</b></span><span><small>ÚLTIMA CONSULTA</small><b>{new Date(result.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</b></span></div>
      <div className="tracking-timeline"><h3>Histórico da entrega</h3>{result.events.map((item, index) => <article key={item.id} className={index === 0 ? "current" : ""}><div className="tracking-event-icon"><EventIcon status={item.status} /></div><div><time><Clock3 /> {[item.date, item.time].filter(Boolean).join(" · ")}</time><h4>{item.description}</h4>{item.origin && <p><b>Origem:</b> {item.origin}</p>}{item.destination && <p><b>Destino:</b> {item.destination}</p>}</div></article>)}</div>
    </section>}

    <section className="tracking-flow"><article><span>01</span><Truck /><h2>Trajeto internacional</h2><p>A encomenda viaja com uma transportadora parceira até o Brasil.</p></article><article><span>02</span><ShieldCheck /><h2>Rastreamento nacional</h2><p>No Brasil, as movimentações dos Correios aparecem diretamente nesta página.</p></article><article><span>03</span><PackageSearch /><h2>Entrega em casa</h2><p>Você acompanha cada etapa até receber sua escolha.</p></article></section>
    <p className="tracking-help">Ainda tem dúvidas sobre sua entrega? <Link href="/">Fale com a Nord pelo atendimento.</Link></p>
  </main><StoreFooter /></>;
}
