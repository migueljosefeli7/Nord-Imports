import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Hand, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";
import { ProductCard } from "@/components/product-card";
import { getStoreSnapshot } from "@/lib/store-repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { products, brands, categories, settings } = await getStoreSnapshot();
  const newest = products.slice(0, 10);
  const sought = products.filter((p) => p.sought);
  const rare = products.filter((p) => p.rare);
  return <><div id="top" /><StoreHeader /><main id="conteudo" tabIndex={-1}>
    <section className="hero">
      <Image src="/hero-nord.png" alt="Sneaker e peças selecionadas Nord Imports" fill priority sizes="100vw" />
      <div className="hero-shade" />
      <div className="hero-index"><span>01</span><i /><span>DROP 09.26</span></div>
      <div className="hero-copy">
        <p className="eyebrow light">CURADORIA NORD · SANTA CATARINA</p>
        <h1>CURADORIA<br /><span>PARA QUEM</span><br />NÃO VESTE O ÓBVIO.</h1>
        <div className="hero-bottom"><p>Sneakers e moda de luxo selecionados a dedo.<br />Atendimento pessoal, do seu estilo até sua casa.</p><Link href="/produtos" className="round-cta" aria-label="Explorar coleção"><ArrowUpRight /></Link></div>
      </div>
      <Image className="hero-mountain" src="/morro-nord.png" alt="" width={593} height={180} aria-hidden="true" />
      <a href="#categorias" className="scroll-cue">DESÇA PARA EXPLORAR <ArrowDown /></a>
    </section>

    <section className="trust-ribbon" aria-label="Compromissos Nord">
      <article><Hand aria-hidden="true" /><span><b>CURADORIA À MÃO</b><small>Cada peça é escolhida individualmente.</small></span></article>
      <article><ShieldCheck aria-hidden="true" /><span><b>QUALIDADE SELECIONADA</b><small>Fotos reais e garantia para defeitos de fábrica.</small></span></article>
      <article><Truck aria-hidden="true" /><span><b>TODO O BRASIL</b><small>Transporte acompanhado até a entrega.</small></span></article>
      <article><PackageCheck aria-hidden="true" /><span><b>SEM CUSTOS SURPRESA</b><small>O valor combinado contempla o caminho até sua casa.</small></span></article>
    </section>

    <section id="categorias" className="category-strip">
      <div className="section-kicker"><span>01</span><p>CATEGORIAS</p></div>
      <div className="category-intro"><p>ESCOLHA SUA CATEGORIA</p><h2>Encontre a peça<br /><i>que combina com você.</i></h2></div>
      <div className="category-grid">{categories.map((c, i) => <Link href={`/produtos?categoria=${encodeURIComponent(c)}`} key={c}><span>0{i + 1}</span><h3>{c}</h3><small>{products.filter((p) => p.category === c).length} PEÇAS</small><ArrowUpRight /></Link>)}<Link href="/produtos"><span>0{categories.length + 1}</span><h3>Ver tudo</h3><small>CATÁLOGO COMPLETO</small><ArrowUpRight /></Link></div>
    </section>

    <section className="products-section">
      <div className="section-kicker"><span>02</span><p>NOVOS NA NORD</p></div>
      <div className="section-title-row"><div><h2>Últimos<br /><i>drops.</i></h2><p>Peças recém-selecionadas para a curadoria.</p></div><Link href="/produtos">VER TODAS <ArrowRight /></Link></div>
      <div className="products-grid">{newest.slice(0, 6).map((p, i) => <ProductCard product={p} index={i} key={p.id} featured={i === 0} />)}</div>
    </section>

    <section className="popular">
      <div className="popular-intro"><div className="section-kicker light"><span>03</span><p>EM ALTA</p></div><h2>OS MAIS<br /><i>DESEJADOS.</i></h2><p>A seleção que concentra olhares, conversas e listas de desejo.</p><a href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noreferrer" className="outline-cta">CONSULTAR DISPONIBILIDADE <ArrowUpRight /></a></div>
      <div className="popular-grid">{sought.map((p, i) => <ProductCard product={p} index={i} key={p.id} />)}</div>
    </section>

    <section className="rare">
      <div className="section-kicker"><span>04</span><p>EDIÇÕES ESPECIAIS</p></div>
      <div className="section-title-row"><div><h2>Achados<br /><i>raros.</i></h2><p>O incomum, encontrado.</p></div></div>
      <div className="rare-list">{rare.map((p, i) => <Link href={`/produto/${p.slug}`} key={p.id}><span>0{i + 1}</span><b>{p.name}</b><small>{p.brand} · {p.subcategory}</small><ArrowRight /></Link>)}</div>
    </section>

    <section className="brand-marquee" aria-label="Marcas disponíveis"><p>{brands.join("  ✦  ")} ✦ {brands.join("  ✦  ")}</p></section>

    <section id="sobre" className="about">
      <div className="about-blue"><Image src="/morro-nord.png" alt="Elemento gráfico da identidade Nord Imports" width={593} height={180} /><p>SANTA CATARINA<br />BRASIL</p></div>
      <div className="about-copy"><div className="section-kicker"><span>05</span><p>MANIFESTO</p></div><h2>NÃO SEGUIMOS<br />O ÓBVIO.<br /><i>ESCOLHEMOS IDENTIDADE.</i></h2><p>De Santa Catarina, a Nord seleciona sneakers e streetwear importados com identidade e história — para quem entende que vestir também é escolher o que representar.</p><Link href="/produtos" className="outline-cta dark">CONHEÇA A CURADORIA <ArrowUpRight /></Link></div>
    </section>
  </main><StoreFooter /></>;
}
