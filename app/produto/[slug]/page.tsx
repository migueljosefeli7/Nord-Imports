import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, PackageCheck, ShieldCheck } from "lucide-react";
import { InterestButton } from "@/components/interest-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { StoreFooter } from "@/components/store-footer";
import { StoreHeader } from "@/components/store-header";
import { getStoreSnapshot } from "@/lib/store-repository";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { products } = await getStoreSnapshot();
  const p = products.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: p.name, description: p.description, openGraph: { title: p.name, description: p.description, images: [p.image] }, twitter: { card: "summary_large_image", title: p.name, description: p.description, images: [p.image] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products, settings } = await getStoreSnapshot();
  const p = products.find((x) => x.slug === slug && x.active);
  if (!p) notFound();
  const related = products.filter((x) => x.brand === p.brand && x.id !== p.id).slice(0, 3);
  const price = p.showPrice && p.price != null ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
  return <><StoreHeader /><main id="conteudo" tabIndex={-1} className="detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Início</Link><span>/</span><Link href="/produtos">Produtos</Link><span>/</span><span aria-current="page">{p.name}</span></nav>
    <div className="detail-grid">
      <ProductGallery images={p.images} name={p.name} />
      <aside className="detail-info">
        <p className="detail-brand">{p.brandLogo && <Image src={p.brandLogo} alt={`Logo ${p.brand}`} width={42} height={42} unoptimized />}{p.brand.toUpperCase()}</p><h1 className={`detail-title ${p.name.length > 55 ? "long" : ""}`}>{p.name}</h1>{price ? <p className="detail-price">{price}<small>Pix, cartão à vista ou em até 12x com juros</small></p> : <p className="detail-consult">VALOR SOB CONSULTA</p>}
        <div className="availability"><span><i /> Disponível sob consulta</span><small>Produto importado</small></div>
        <div className="detail-meta"><Link href={`/produtos?marca=${encodeURIComponent(p.brand)}`}>{p.brand}</Link><Link href={`/produtos?categoria=${encodeURIComponent(p.category)}`}>{p.category}</Link><Link href={`/produtos?subcategoria=${encodeURIComponent(p.subcategory)}`}>{p.subcategory}</Link></div>
        <section className="product-story"><h2>Sobre esta peça</h2><p>{p.description}</p></section>
        <div className="detail-actions"><InterestButton phone={settings.whatsapp} message={settings.message} product={p.name} /></div>
        <ul className="trust-list"><li><ShieldCheck aria-hidden="true" /><span><b>Curadoria Nord</b><small>Selecionado individualmente pela nossa equipe.</small></span></li><li><PackageCheck aria-hidden="true" /><span><b>Entrega sem surpresa</b><small>Os custos combinados contemplam o envio até sua casa.</small></span></li><li><Check aria-hidden="true" /><span><b>Atendimento humano</b><small>Escolha, tamanho, pagamento e prazo resolvidos pelo WhatsApp.</small></span></li></ul>
      </aside>
    </div>
    {related.length > 0 && <section className="products-section related-section"><div className="section-title-row"><div><p className="eyebrow">MESMA MARCA</p><h2>Você também pode gostar</h2></div><Link href={`/produtos?marca=${encodeURIComponent(p.brand)}`}>VER {p.brand.toUpperCase()}</Link></div><div className="products-grid">{related.map((x, i) => <ProductCard product={x} index={i} key={x.id} />)}</div></section>}
  </main><StoreFooter /></>;
}
