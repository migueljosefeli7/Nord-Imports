import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getStoreSnapshot } from "@/lib/store-repository";
import { StoreHeader } from "@/components/store-header";
import { StoreFooter } from "@/components/store-footer";

export const dynamic = "force-dynamic";

export default async function Brands() {
  const { brandDetails, products } = await getStoreSnapshot();
  return <><StoreHeader /><main id="conteudo" tabIndex={-1} className="brands-page"><p className="eyebrow">DE A A Z</p><h1 className="brand-title">Marcas selecionadas</h1><p className="page-lead">Explore a curadoria por marca e encontre todas as categorias disponíveis.</p><div className="brands-grid">{brandDetails.map((brand) => <Link className="brand-card" href={`/marca/${brand.slug}`} key={brand.id}><span>{products.filter((product) => product.brand === brand.name).length} PEÇAS</span><div className="brand-card-logo">{brand.logoUrl ? <Image src={brand.logoUrl} alt={`Logo ${brand.name}`} fill sizes="33vw" unoptimized /> : <h2>{brand.name}</h2>}</div><strong>{brand.name}</strong><ArrowUpRight /></Link>)}</div></main><StoreFooter /></>;
}
