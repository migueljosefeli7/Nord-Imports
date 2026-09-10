import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreSnapshot } from "@/lib/store-repository";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function Brand({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { brands, products } = await getStoreSnapshot();
  const brand = brands.find((item) => item.toLowerCase().replaceAll(" ", "-") === decodeURIComponent(slug).toLowerCase());
  if (!brand) notFound();
  const list = products.filter((product) => product.brand === brand);
  const categories = [...new Set(list.map((product) => product.category))];
  return <><StoreHeader /><main id="conteudo" tabIndex={-1} className="catalog"><div className="breadcrumbs"><Link href="/">Início</Link><span>/</span><Link href="/marcas">Marcas</Link><span>/</span><span>{brand}</span></div><p className="eyebrow">MARCA</p><h1 className="brand-title">{brand}</h1><div className="brand-category-links" aria-label="Categorias da marca">{categories.map((category) => <Link key={category} href={`/produtos?marca=${encodeURIComponent(brand)}&categoria=${encodeURIComponent(category)}`}>{category}</Link>)}</div><p className="catalog-result-row"><span>{list.length} {list.length === 1 ? "peça" : "peças"} disponíveis</span></p>{list.length ? <div className="products-grid">{list.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="catalog-empty"><h2>Nenhuma peça publicada.</h2><p>Os produtos desta marca aparecerão aqui assim que forem ativados no painel.</p></div>}</main><StoreFooter /></>;
}
