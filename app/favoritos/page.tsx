import { FavoritesView } from "@/components/favorites-view";
import { StoreFooter } from "@/components/store-footer";
import { StoreHeader } from "@/components/store-header";
import { getStoreSnapshot } from "@/lib/store-repository";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { products } = await getStoreSnapshot();
  return <><StoreHeader /><main id="conteudo" className="catalog favorites-page" tabIndex={-1}><div className="favorites-heading"><p className="eyebrow">CURADORIA PESSOAL</p><h1 className="catalog-title">Seus favoritos.</h1><p>Guarde as peças que chamaram sua atenção e decida no seu tempo.</p></div><FavoritesView products={products} /></main><StoreFooter /></>;
}
