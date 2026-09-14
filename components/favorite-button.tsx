"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/favorites";

export function FavoriteButton({ productId, productName, variant = "card" }: { productId: string; productName: string; variant?: "card" | "detail" }) {
  const favorites = useFavorites();
  const active = favorites.has(productId);
  return <button type="button" className={`favorite-button ${variant} ${active ? "active" : ""}`} aria-pressed={active} aria-label={active ? `Remover ${productName} dos favoritos` : `Salvar ${productName} nos favoritos`} title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"} onClick={(event) => { event.preventDefault(); event.stopPropagation(); favorites.toggle(productId); }}><Heart fill={active ? "currentColor" : "none"} />{variant === "detail" && <span>{active ? "SALVO NOS FAVORITOS" : "ADICIONAR AOS FAVORITOS"}</span>}</button>;
}
