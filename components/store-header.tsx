"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brands, categories, products, settings } from "@/lib/data";

function NavLinks({ closeMobile = false }: { closeMobile?: boolean }) {
  const MaybeClose = ({ children }: { children: ReactNode }) => closeMobile ? <SheetClose asChild>{children}</SheetClose> : <>{children}</>;
  return <>
    <MaybeClose><Link href="/produtos">Novidades</Link></MaybeClose>
    <div className="nav-drop"><button aria-haspopup="true">Marcas</button><div>{brands.map((b) => <MaybeClose key={b}><Link href={`/marca/${encodeURIComponent(b.toLowerCase().replaceAll(" ", "-"))}`}>{b}</Link></MaybeClose>)}</div></div>
    <div className="nav-drop"><button aria-haspopup="true">Categorias</button><div>{categories.map((c) => <MaybeClose key={c}><Link href={`/produtos?categoria=${encodeURIComponent(c)}`}>{c}</Link></MaybeClose>)}</div></div>
    <MaybeClose><Link href="/marcas">Marcas A–Z</Link></MaybeClose>
    <MaybeClose><Link href="/#sobre">Manifesto</Link></MaybeClose>
  </>;
}

export function StoreHeader() {
  const [q, setQ] = useState("");
  const found = q.trim().length > 1 ? products.filter((p) => [p.name, p.brand, p.category, p.description].join(" ").toLowerCase().includes(q.toLowerCase())).slice(0, 12) : [];
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="announcement"><span>NORD IMPORTS®</span><p>Curadoria independente · Envios para todo o Brasil</p><span>EST. 2026</span></div>
    <header className="site-header">
      <div className="nav-wrap">
        <Sheet>
          <SheetTrigger asChild><button className="icon-button mobile-only" aria-label="Abrir menu"><Menu /></button></SheetTrigger>
          <SheetContent side="left" className="mobile-menu-sheet" showCloseButton={false}>
            <SheetTitle className="sr-only">Menu principal</SheetTitle>
            <div className="mobile-menu-top"><BrandLogo className="header-logo" /><SheetClose asChild><button className="menu-close" aria-label="Fechar menu"><X /></button></SheetClose></div>
            <nav className="mobile-nav" aria-label="Navegação mobile"><NavLinks closeMobile /></nav>
            <a className="mobile-wa" target="_blank" rel="noreferrer" href={`https://wa.me/${settings.whatsapp}`}>FALAR COM A NORD <ArrowUpRight /></a>
          </SheetContent>
        </Sheet>
        <Link href="/" aria-label="Nord Imports — início"><BrandLogo className="header-logo" /></Link>
        <nav className="main-nav" aria-label="Navegação principal"><NavLinks /></nav>
        <div className="nav-actions">
          <Dialog onOpenChange={(open) => { if (!open) setQ(""); }}>
            <DialogTrigger asChild><button className="icon-button search-trigger" aria-label="Buscar produtos"><Search /><span>Buscar</span></button></DialogTrigger>
            <DialogContent className="search-overlay" showCloseButton={false}>
              <DialogTitle className="sr-only">Buscar produtos</DialogTitle>
              <div className="search-panel">
                <div className="search-top"><BrandLogo className="search-logo" /><DialogClose asChild><button className="search-close" aria-label="Fechar busca"><X /></button></DialogClose></div>
                <p className="eyebrow">ENCONTRE SUA PRÓXIMA PEÇA</p>
                <div className="search-line"><Search aria-hidden="true" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modelo, marca ou categoria" aria-label="Termo de busca" /></div>
                <div className="search-results" aria-live="polite" aria-atomic="true">
                  {q.length < 2 ? <p>Digite pelo menos 2 caracteres para começar.</p> : found.length ? found.map((p) => <DialogClose asChild key={p.id}><Link href={`/produto/${p.slug}`}><Image src={p.image} alt="" width={92} height={76} /><span><b>{p.name}</b><small>{p.brand} · {p.category}</small></span><ArrowUpRight /></Link></DialogClose>) : <div className="search-empty"><b>Nenhuma peça por aqui.</b><p>Tente buscar por Nike, Jordan, tênis ou moletom.</p></div>}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <a className="wa-small" target="_blank" rel="noreferrer" href={`https://wa.me/${settings.whatsapp}`}>Atendimento <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </header>
  </>;
}
