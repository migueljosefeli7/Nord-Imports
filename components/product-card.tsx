import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/data";
import { FavoriteButton } from "@/components/favorite-button";

export function ProductCard({ product, index = 0, featured = false }: { product: Product; index?: number; featured?: boolean }) {
  const price = product.showPrice && product.price != null ? product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
  const brandLabel = (product.brands || [product.brand]).join(" × ");
  return <article className={`product-card ${featured ? "featured" : ""}`}>
    <Link href={`/produto/${product.slug}`} className="product-image" aria-label={`Ver ${product.name}`}>
      <Image src={product.image} alt={product.name} fill unoptimized={product.image.startsWith("http")} sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"} />
      <span className="product-number">DROP / {String(index + 1).padStart(2, "0")}</span>
      {product.rare && <span className="rare-tag">RARO</span>}
      <span className="view-tag">VER PEÇA <ArrowUpRight size={16} /></span>
    </Link>
    <FavoriteButton productId={product.id} productName={product.name} />
    <div className="product-info"><div><p>{product.brandLogo && <Image src={product.brandLogo} alt="" width={28} height={28} unoptimized />}<span>{brandLabel} · {product.subcategory}</span></p><h3><Link href={`/produto/${product.slug}`}>{product.name}</Link></h3></div><strong>{price || "Sob consulta"}</strong></div>
  </article>;
}
