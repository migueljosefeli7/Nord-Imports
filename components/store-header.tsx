"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brands, categories, settings } from "@/lib/data";
import type { Product } from "@/lib/data";
import { useFavorites } from "@/lib/favorites";

function MaybeClose({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  return enabled ? <SheetClose asChild>{children}</SheetClose> : <>{children}</>;
}

function NavLinks({ brandList, categoryList, closeMobile = false }: { brandList: string[]; categoryList: string[]; closeMobile?: boolean }) {
  return <>
    <MaybeClose enabled={closeMobile}><Link href="/produtos">Novidades</Link></MaybeClose>
    <div className="nav-drop"><button aria-haspopup="true">Marcas</button><div>{brandList.map((b) => <MaybeClose enabled={closeMobile} key={b}><Link href={`/marca/${encodeURIComponent(b.toLowerCase().replaceAll(" ", "-"))}`}>{b}</Link></MaybeClose>)}</div></div>
    <div className="nav-drop"><button aria-haspopup="true">Categorias</button><div>{categoryList.map((c) => <MaybeClose enabled={closeMobile} key={c}><Link href={`/produtos?categoria=${encodeURIComponent(c)}`}>{c}</Link></MaybeClose>)}</div></div>
    <MaybeClose enabled={closeMobile}><Link href="/marcas">Marcas A–Z</Link></MaybeClose>
    <MaybeClose enabled={closeMobile}><Link href="/rastreio">Rastrear pedido</Link></MaybeClose>
    <MaybeClose enabled={closeMobile}><Link href="/#sobre">Manifesto</Link></MaybeClose>
  </>;
}

export function StoreHeader() {
  const favorites = useFavorites();
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [found, setFound] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [brandList, setBrandList] = useState(brands);
  const [categoryList, setCategoryList] = useState(categories);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp);
  const visibleResults = q.trim().length > 1 ? found : [];

  useEffect(() => {
    fetch("/api/catalog").then((response) => response.ok ? response.json() : null).then((data) => { if (data) { setBrandList(data.brands); setCategoryList(data.categories); setWhatsapp(data.settings.whatsapp); } }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : []).then(setFound).catch(() => undefined).finally(() => setSearching(false)), 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);
  useEffect(() => {
    if (!searchOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSearchOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", close); };
  }, [searchOpen]);
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
            <nav className="mobile-nav" aria-label="Navegação mobile"><NavLinks brandList={brandList} categoryList={categoryList} closeMobile /></nav>
            <a className="mobile-wa" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}`}>FALAR COM A NORD <ArrowUpRight /></a>
          </SheetContent>
        </Sheet>
        <Link href="/" aria-label="Nord Imports — início"><BrandLogo className="header-logo" /></Link>
        <nav className="main-nav" aria-label="Navegação principal"><NavLinks brandList={brandList} categoryList={categoryList} /></nav>
        <div className="nav-actions">
          <Link className="header-favorites" href="/favoritos" aria-label={`Favoritos: ${favorites.count} produtos`}><Heart fill={favorites.count ? "currentColor" : "none"} /><span>Favoritos</span>{favorites.count > 0 && <b>{favorites.count}</b>}</Link>
          <button className="icon-button search-trigger" aria-label="Buscar produtos" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}><Search /><span>Buscar</span></button>
          {searchOpen && <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Buscar produtos">
              <div className="search-panel">
                <div className="search-top"><BrandLogo className="search-logo" /><button className="search-close" aria-label="Fechar busca" onClick={() => { setSearchOpen(false); setQ(""); }}><X /></button></div>
                <p className="eyebrow">ENCONTRE SUA PRÓXIMA PEÇA</p>
                <div className="search-line"><Search aria-hidden="true" /><input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSearching(e.target.value.trim().length >= 2); }} placeholder="Modelo, marca ou categoria" aria-label="Termo de busca" /></div>
                <div className="search-results" aria-live="polite" aria-atomic="true">
                  {q.length < 2 ? <p>Digite pelo menos 2 caracteres para começar.</p> : searching ? <p className="search-loading">Buscando peças...</p> : visibleResults.length ? visibleResults.map((p) => <Link href={`/produto/${p.slug}`} onClick={() => setSearchOpen(false)} key={p.id}><Image src={p.image} alt="" width={92} height={76} unoptimized={p.image.startsWith("http")} /><span><b>{p.name}</b><small>{p.brand} · {p.category}</small></span><ArrowUpRight /></Link>) : <div className="search-empty"><b>Nenhuma peça por aqui.</b><p>Tente buscar por Nike, Jordan, tênis ou moletom.</p></div>}
                </div>
              </div>
          </div>}
          <a className="wa-small" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}`}>Atendimento <ArrowUpRight size={16} /></a>
        </div>
      </div>
    </header>
  </>;
}
