import { createClient } from "@supabase/supabase-js";
import { brands as fallbackBrands, categories as fallbackCategories, products as fallbackProducts, settings as fallbackSettings, type Product } from "@/lib/data";

export type StoreSnapshot = { products: Product[]; brands: string[]; categories: string[]; settings: { whatsapp: string; message: string } };
type RawProduct = { id: string; slug: string; name: string; description: string | null; brand_id: string | null; categoria_id: string | null; subcategoria_id: string | null; active: boolean; rare: boolean | null; sought: boolean | null; created_at: string; product_images: { url: string; sort_order: number; is_cover: boolean }[] };

export async function getStoreSnapshot(): Promise<StoreSnapshot> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fallback();
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [brandsResult, categoriesResult, subcategoriesResult, productsResult, settingsResult] = await Promise.all([
      supabase.from("brands").select("id,name,slug").order("name"),
      supabase.from("categories").select("id,name,slug,brand_id").order("name"),
      supabase.from("subcategories").select("id,name,slug,category_id").order("name"),
      supabase.from("products").select("id,slug,name,description,brand_id,categoria_id,subcategoria_id,active,rare,sought,created_at,product_images(url,sort_order,is_cover)").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("store_settings").select("whatsapp,default_message").eq("id", 1).maybeSingle(),
    ]);
    if (brandsResult.error || categoriesResult.error || subcategoriesResult.error || productsResult.error) return fallback();
    const brandMap = new Map((brandsResult.data || []).map((item) => [item.id, item.name]));
    const categoryMap = new Map((categoriesResult.data || []).map((item) => [item.id, item.name]));
    const subcategoryMap = new Map((subcategoriesResult.data || []).map((item) => [item.id, item.name]));
    const products: Product[] = ((productsResult.data || []) as unknown as RawProduct[]).map((item) => {
      const images = [...(item.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order).map((image) => image.url);
      return { id: item.id, slug: item.slug, name: item.name, brand: brandMap.get(item.brand_id) || "Sem marca", category: categoryMap.get(item.categoria_id) || "Sem categoria", subcategory: subcategoryMap.get(item.subcategoria_id) || "Sem subcategoria", description: item.description || "", image: images[0] || "/hero-nord.png", images: images.length ? images : ["/hero-nord.png"], active: true, rare: Boolean(item.rare), sought: Boolean(item.sought), createdAt: item.created_at };
    });
    return {
      products,
      brands: (brandsResult.data || []).map((item) => item.name),
      categories: [...new Set((categoriesResult.data || []).map((item) => item.name))],
      settings: settingsResult.data ? { whatsapp: settingsResult.data.whatsapp, message: settingsResult.data.default_message } : fallbackSettings,
    };
  } catch { return fallback(); }
}

function fallback(): StoreSnapshot { return { products: fallbackProducts, brands: fallbackBrands, categories: fallbackCategories, settings: fallbackSettings }; }
