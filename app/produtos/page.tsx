"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";
import { ProductCard } from "@/components/product-card";
import { brands, products } from "@/lib/data";

function CatalogContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") || "");
  const [brand, setBrand] = useState(params.get("marca") || "");
  const [cat, setCat] = useState(params.get("categoria") || "");
  const [sub, setSub] = useState(params.get("subcategoria") || "");
  const allowedCats = [...new Set(products.filter((p) => !brand || p.brand === brand).map((p) => p.category))];
  const subs = [...new Set(products.filter((p) => (!brand || p.brand === brand) && (!cat || p.category === cat)).map((p) => p.subcategory))];
  const list = useMemo(() => products.filter((p) => p.active && (!q || [p.name, p.brand, p.category, p.description].join(" ").toLowerCase().includes(q.toLowerCase())) && (!brand || p.brand === brand) && (!cat || p.category === cat) && (!sub || p.subcategory === sub)), [q, brand, cat, sub]);
  const active = [["Marca", brand, () => { setBrand(""); setCat(""); setSub(""); }], ["Categoria", cat, () => { setCat(""); setSub(""); }], ["Subcategoria", sub, () => setSub("")]] as const;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (brand) next.set("marca", brand);
      if (cat) next.set("categoria", cat);
      if (sub) next.set("subcategoria", sub);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [q, brand, cat, sub, pathname, router]);

  function clear() { setQ(""); setBrand(""); setCat(""); setSub(""); }

  return <><StoreHeader /><main id="conteudo" className="catalog" tabIndex={-1}>
    <div className="catalog-head"><div><p className="eyebrow">CURADORIA COMPLETA</p><h1 className="catalog-title">Todas as peças</h1><p>Use os filtros para encontrar rapidamente marca, categoria ou modelo.</p></div></div>
    <section className="filter-panel" aria-labelledby="filter-title">
      <div className="filter-panel-title"><SlidersHorizontal aria-hidden="true" /><h2 id="filter-title">Filtrar catálogo</h2>{(q || brand || cat || sub) && <button onClick={clear}>Limpar tudo</button>}</div>
      <div className="filter-bar">
        <label className="search-field"><span>Buscar</span><div><Search aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, marca ou categoria" /></div></label>
        <label><span>Marca</span><select value={brand} onChange={(e) => { setBrand(e.target.value); setCat(""); setSub(""); }}><option value="">Todas</option>{brands.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><span>Categoria</span><select value={cat} onChange={(e) => { setCat(e.target.value); setSub(""); }}><option value="">Todas</option>{allowedCats.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label><span>Subcategoria</span><select value={sub} onChange={(e) => setSub(e.target.value)} disabled={!cat}><option value="">Todas</option>{subs.map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      {(brand || cat || sub) && <div className="active-filters" aria-label="Filtros ativos">{active.filter(([, value]) => value).map(([label, value, remove]) => <button key={label} onClick={remove} aria-label={`Remover filtro ${label}: ${value}`}><span>{label}: {value}</span><X aria-hidden="true" /></button>)}</div>}
    </section>
    <div className="catalog-result-row"><p role="status" aria-live="polite">{list.length} {list.length === 1 ? "peça encontrada" : "peças encontradas"}</p><span>Somente itens ativos</span></div>
    {list.length ? <div className="products-grid">{list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div> : <div className="catalog-empty"><Search aria-hidden="true" /><h2>Nada com esses filtros.</h2><p>Remova algum filtro ou tente uma busca mais simples.</p><button className="button primary" onClick={clear}>LIMPAR FILTROS</button></div>}
  </main><StoreFooter /></>;
}

export default function Catalog() { return <Suspense fallback={<main className="catalog catalog-loading" aria-busy="true">Carregando catálogo…</main>}><CatalogContent /></Suspense>; }
