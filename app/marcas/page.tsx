import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getStoreSnapshot } from "@/lib/store-repository";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";

export const dynamic = "force-dynamic";

export default async function Brands() {
  const { brands, products } = await getStoreSnapshot();
  return <><StoreHeader /><main id="conteudo" tabIndex={-1} className="brands-page"><p className="eyebrow">DE A A Z</p><h1 className="brand-title">Marcas selecionadas</h1><p className="page-lead">Explore a curadoria por marca e encontre todas as categorias disponíveis.</p><div className="brands-grid">{brands.map((brand) => <Link className="brand-card" href={`/marca/${brand.toLowerCase().replaceAll(" ", "-")}`} key={brand}><span>{products.filter((product) => product.brand === brand).length} PEÇAS</span><h2>{brand}</h2><ArrowUpRight /></Link>)}</div></main><StoreFooter /></>;
}
