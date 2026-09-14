"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useFavorites } from "@/lib/favorites";
import type { Product } from "@/lib/data";

export function FavoritesView({ products }: { products: Product[] }) {
  const favorites = useFavorites();
  const selected = products.filter((product) => favorites.has(product.id));
  if (!selected.length) return <section className="favorites-empty"><Heart /><p className="eyebrow">SUA SELEÇÃO</p><h2>Nenhuma peça salva.</h2><p>Use o coração nos produtos para montar sua seleção e voltar quando quiser.</p><Link className="button primary" href="/produtos">EXPLORAR CATÁLOGO</Link></section>;
  return <><div className="favorites-toolbar"><p><b>{selected.length}</b> {selected.length === 1 ? "peça salva" : "peças salvas"} neste dispositivo</p><button type="button" onClick={favorites.clear}><Trash2 /> LIMPAR FAVORITOS</button></div><div className="products-grid">{selected.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div></>;
}
