"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { brands, categories, products, settings } from "@/lib/data";

export function StoreHeader() {
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const found = q.trim().length > 1
    ? products.filter((p) => [p.name, p.brand, p.category, p.description].join(" ").toLowerCase().includes(q.toLowerCase())).slice(0, 12)
    : [];

  useEffect(() => {
    document.body.style.overflow = search || menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [search, menu]);

  return <>
    <div className="announcement"><span>NORD IMPORTS®</span><p>Curadoria independente · Envios para todo o Brasil</p><span>EST. 2026</span></div>
    <header className="site-header">
      <div className="nav-wrap">
        <button className="icon-button mobile-only" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></button>
        <Link href="/" aria-label="Nord Imports — início"><BrandLogo className="header-logo" /></Link>
        <nav className={menu ? "main-nav open" : "main-nav"} aria-label="Navegação principal">
          <button className="menu-close mobile-only" onClick={() => setMenu(false)} aria-label="Fechar menu"><X /></button>
          <Link href="/produtos">Novidades</Link>
          <div className="nav-drop"><button>Marcas</button><div>{brands.map((b) => <Link key={b} href={`/marca/${encodeURIComponent(b.toLowerCase().replaceAll(" ", "-"))}`}>{b}</Link>)}</div></div>
          <div className="nav-drop"><button>Categorias</button><div>{categories.map((c) => <Link key={c} href={`/produtos?categoria=${encodeURIComponent(c)}`}>{c}</Link>)}</div></div>
          <Link href="/marcas">Marcas A–Z</Link><Link href="/#sobre">Manifesto</Link>
        </nav>
        <div className="nav-actions">
          <button className="icon-button search-trigger" aria-label="Buscar produtos" onClick={() => setSearch(true)}><Search /><span>Buscar</span></button>
          <a className="wa-small" target="_blank" rel="noreferrer" href={`https://wa.me/${settings.whatsapp}`}>Atendimento <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </header>
    {search && <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Buscar produtos">
      <div className="search-panel">
        <div className="search-top"><BrandLogo className="search-logo" /><button className="search-close" onClick={() => setSearch(false)} aria-label="Fechar busca"><X /></button></div>
        <p className="eyebrow">ENCONTRE SUA PRÓXIMA PEÇA</p>
        <div className="search-line"><Search aria-hidden="true" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modelo, marca ou categoria" aria-label="Termo de busca" /></div>
        <div className="search-results" aria-live="polite">
          {q.length < 2 ? <p>Digite pelo menos 2 caracteres para começar.</p> : found.length ? found.map((p) => <Link onClick={() => setSearch(false)} key={p.id} href={`/produto/${p.slug}`}><Image src={p.image} alt="" width={92} height={76} /><span><b>{p.name}</b><small>{p.brand} · {p.category}</small></span><ArrowUpRight /></Link>) : <div className="search-empty"><b>Nenhuma peça por aqui.</b><p>Tente buscar por Nike, Jordan, tênis ou moletom.</p></div>}
        </div>
      </div>
    </div>}
  </>;
}
