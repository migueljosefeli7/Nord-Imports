"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";
import { ProductCard } from "@/components/product-card";
import { brands, products, type Product } from "@/lib/data";

type FilterKey = "marcas" | "categorias" | "subcategorias";
type Sort = "recentes" | "az" | "za" | "menor-preco" | "maior-preco";

function initialValues(params: URLSearchParams, singular: string, plural: string) {
  const legacy = params.get(singular);
  return [...new Set([...params.getAll(plural), ...(legacy ? [legacy] : [])])];
}

function MultiFilter({ label, options, selected, onToggle, disabled = false }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void; disabled?: boolean }) {
  return <details className="catalog-multi" data-disabled={disabled || undefined}>
    <summary aria-label={`${label}: ${selected.length ? `${selected.length} selecionado(s)` : "todos"}`}><span><small>{label}</small><b>{selected.length ? `${selected.length} selecionado${selected.length > 1 ? "s" : ""}` : "Todos"}</b></span><ChevronDown aria-hidden="true" /></summary>
    {!disabled && <div className="catalog-options">{options.length ? options.map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} /><span>{option}</span></label>) : <p>Nenhuma opção disponível</p>}</div>}
  </details>;
}

function CatalogContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.get("q") || "");
  const [selectedBrands, setSelectedBrands] = useState(() => initialValues(params, "marca", "marcas"));
  const [selectedCategories, setSelectedCategories] = useState(() => initialValues(params, "categoria", "categorias"));
  const [selectedSubcategories, setSelectedSubcategories] = useState(() => initialValues(params, "subcategoria", "subcategorias"));
  const [availability, setAvailability] = useState(params.get("valor") || "todos");
  const [feature, setFeature] = useState(params.get("destaque") || "todos");
  const [sort, setSort] = useState<Sort>((params.get("ordem") as Sort) || "recentes");
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(products);
  const [brandOptions, setBrandOptions] = useState(brands);

  const availableCategories = useMemo(() => [...new Set(catalogProducts.filter((p) => !selectedBrands.length || (p.brands || [p.brand]).some((brand) => selectedBrands.includes(brand))).map((p) => p.category))].sort(), [catalogProducts, selectedBrands]);
  const availableSubcategories = useMemo(() => [...new Set(catalogProducts.filter((p) => (!selectedBrands.length || (p.brands || [p.brand]).some((brand) => selectedBrands.includes(brand))) && (!selectedCategories.length || selectedCategories.includes(p.category))).map((p) => p.subcategory))].sort(), [catalogProducts, selectedBrands, selectedCategories]);

  const list = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("pt-BR");
    return catalogProducts.filter((p) => {
      const productBrands = p.brands || [p.brand];
      const searchable = [p.name, ...productBrands, p.category, p.subcategory, p.description].join(" ").toLocaleLowerCase("pt-BR");
      return p.active && (!term || searchable.includes(term)) && (!selectedBrands.length || productBrands.some((brand) => selectedBrands.includes(brand))) && (!selectedCategories.length || selectedCategories.includes(p.category)) && (!selectedSubcategories.length || selectedSubcategories.includes(p.subcategory)) && (availability === "todos" || (availability === "com-preco" ? p.showPrice && p.price != null : !p.showPrice || p.price == null)) && (feature === "todos" || (feature === "raros" ? p.rare : p.sought));
    }).sort((a, b) => sort === "az" ? a.name.localeCompare(b.name, "pt-BR") : sort === "za" ? b.name.localeCompare(a.name, "pt-BR") : sort === "menor-preco" ? (a.price ?? Infinity) - (b.price ?? Infinity) : sort === "maior-preco" ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [catalogProducts, q, selectedBrands, selectedCategories, selectedSubcategories, availability, feature, sort]);

  const activeCount = selectedBrands.length + selectedCategories.length + selectedSubcategories.length + Number(Boolean(q.trim())) + Number(availability !== "todos") + Number(feature !== "todos");
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((data) => { if (data) { setCatalogProducts(data.products); setBrandOptions(data.brands); } }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      selectedBrands.forEach((item) => next.append("marcas", item));
      selectedCategories.forEach((item) => next.append("categorias", item));
      selectedSubcategories.forEach((item) => next.append("subcategorias", item));
      if (availability !== "todos") next.set("valor", availability);
      if (feature !== "todos") next.set("destaque", feature);
      if (sort !== "recentes") next.set("ordem", sort);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [q, selectedBrands, selectedCategories, selectedSubcategories, availability, feature, sort, pathname, router]);

  function clear() { setQ(""); setSelectedBrands([]); setSelectedCategories([]); setSelectedSubcategories([]); setAvailability("todos"); setFeature("todos"); setSort("recentes"); }
  function removeChip(key: FilterKey, value: string) { toggle(key === "marcas" ? setSelectedBrands : key === "categorias" ? setSelectedCategories : setSelectedSubcategories, value); }
  const classificationChips: [FilterKey, string][] = [...selectedBrands.map((v) => ["marcas", v] as [FilterKey, string]), ...selectedCategories.map((v) => ["categorias", v] as [FilterKey, string]), ...selectedSubcategories.map((v) => ["subcategorias", v] as [FilterKey, string])];

  return <><StoreHeader /><main id="conteudo" className="catalog" tabIndex={-1}>
    <div className="catalog-head"><div><p className="eyebrow">CURADORIA COMPLETA</p><h1 className="catalog-title">Encontre sua peça</h1><p>Combine marcas, categorias e preferências. Inclusive collabs: uma peça aparece em todas as marcas que a assinam.</p></div></div>
    <section className="filter-panel filter-panel-complete" aria-labelledby="filter-title">
      <div className="filter-panel-title"><SlidersHorizontal aria-hidden="true" /><h2 id="filter-title">Filtrar catálogo</h2>{activeCount > 0 && <span className="filter-count">{activeCount}</span>}{activeCount > 0 && <button onClick={clear}>Limpar tudo</button>}</div>
      <label className="catalog-search"><Search aria-hidden="true" /><span className="sr-only">Buscar no catálogo</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busque por peça, modelo, marca ou categoria…" />{q && <button type="button" onClick={() => setQ("")} aria-label="Limpar busca"><X /></button>}</label>
      <div className="filter-grid">
        <MultiFilter label="Marcas" options={[...brandOptions].sort()} selected={selectedBrands} onToggle={(v) => toggle(setSelectedBrands, v)} />
        <MultiFilter label="Categorias" options={availableCategories} selected={selectedCategories} onToggle={(v) => toggle(setSelectedCategories, v)} />
        <MultiFilter label="Subcategorias" options={availableSubcategories} selected={selectedSubcategories} onToggle={(v) => toggle(setSelectedSubcategories, v)} disabled={!availableCategories.length} />
        <label className="catalog-select"><small>Valor</small><select value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="todos">Todos</option><option value="com-preco">Com preço</option><option value="sob-consulta">Sob consulta</option></select></label>
        <label className="catalog-select"><small>Seleção</small><select value={feature} onChange={(e) => setFeature(e.target.value)}><option value="todos">Todas as peças</option><option value="procurados">Mais procurados</option><option value="raros">Achados raros</option></select></label>
      </div>
      {activeCount > 0 && <div className="active-filters" aria-label="Filtros ativos">{q.trim() && <button onClick={() => setQ("")}><span>Busca: {q.trim()}</span><X /></button>}{classificationChips.map(([key, value]) => <button key={`${key}-${value}`} onClick={() => removeChip(key, value)}><span>{value}</span><X /></button>)}{availability !== "todos" && <button onClick={() => setAvailability("todos")}><span>{availability === "com-preco" ? "Com preço" : "Sob consulta"}</span><X /></button>}{feature !== "todos" && <button onClick={() => setFeature("todos")}><span>{feature === "raros" ? "Achados raros" : "Mais procurados"}</span><X /></button>}</div>}
    </section>
    <div className="catalog-result-row"><p role="status" aria-live="polite"><b>{list.length}</b> {list.length === 1 ? "peça encontrada" : "peças encontradas"}</p><label>Ordenar por <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="recentes">Mais recentes</option><option value="az">Nome: A–Z</option><option value="za">Nome: Z–A</option><option value="menor-preco">Menor preço</option><option value="maior-preco">Maior preço</option></select></label></div>
    {list.length ? <div className="products-grid">{list.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div> : <div className="catalog-empty"><Sparkles aria-hidden="true" /><h2>Nenhuma peça encontrada</h2><p>Tente retirar um filtro ou usar um termo mais amplo.</p><button className="button primary" onClick={clear}>LIMPAR FILTROS</button></div>}
  </main><StoreFooter /></>;
}

export default function Catalog() { return <Suspense fallback={<main className="catalog catalog-loading" aria-busy="true">Carregando catálogo…</main>}><CatalogContent /></Suspense>; }
