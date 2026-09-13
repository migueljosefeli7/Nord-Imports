import { createClient } from "@supabase/supabase-js";
import { brands as fallbackBrands, categories as fallbackCategories, products as fallbackProducts, settings as fallbackSettings, type Product } from "@/lib/data";
import { getSupabaseBrowserConfig } from "@/lib/supabase";
import { isVideoUrl } from "@/lib/media";

export type BrandRecord = { id: string; name: string; slug: string; logoUrl: string | null };
export type StoreSnapshot = { products: Product[]; brands: string[]; brandDetails: BrandRecord[]; categories: string[]; settings: { whatsapp: string; message: string }; configured: boolean; error?: string };
type RawProduct = { id: string; slug: string; name: string; description: string | null; brand_id: string | null; categoria_id: string | null; subcategoria_id: string | null; active: boolean; rare: boolean | null; sought: boolean | null; price: number | null; show_price: boolean | null; created_at: string; product_images: { url: string; sort_order: number; is_cover: boolean }[] };
type ProductBrandLink = { product_id: string; brand_id: string };

export async function getStoreSnapshot(): Promise<StoreSnapshot> {
  const { url, key } = getSupabaseBrowserConfig();
  if (!url || !key) return process.env.NODE_ENV === "development" ? fallback() : unavailable("Supabase não configurado.");
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const [brandsResult, categoriesResult, subcategoriesResult, productsResult, settingsResult, productBrandsResult] = await Promise.all([
      supabase.from("brands").select("id,name,slug,logo_url").order("name"),
      supabase.from("categories").select("id,name,slug,brand_id").order("name"),
      supabase.from("subcategories").select("id,name,slug,category_id").order("name"),
      supabase.from("products").select("id,slug,name,description,brand_id,categoria_id,subcategoria_id,active,rare,sought,price,show_price,created_at,product_images(url,sort_order,is_cover)").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("store_settings").select("whatsapp,default_message").eq("id", 1).maybeSingle(),
      supabase.from("product_brands").select("product_id,brand_id"),
    ]);
    const queryError = brandsResult.error || categoriesResult.error || subcategoriesResult.error || productsResult.error || settingsResult.error;
    if (queryError) return unavailable(queryError.message);
    const brandMap = new Map((brandsResult.data || []).map((item) => [item.id, item.name]));
    const brandLogoMap = new Map((brandsResult.data || []).map((item) => [item.id, item.logo_url as string | null]));
    const categoryMap = new Map((categoriesResult.data || []).map((item) => [item.id, item.name]));
    const subcategoryMap = new Map((subcategoriesResult.data || []).map((item) => [item.id, item.name]));
    const extraBrands = new Map<string, string[]>();
    for (const link of ((productBrandsResult.data || []) as ProductBrandLink[])) {
      const current = extraBrands.get(link.product_id) || [];
      current.push(link.brand_id);
      extraBrands.set(link.product_id, current);
    }
    const products: Product[] = ((productsResult.data || []) as unknown as RawProduct[]).map((item) => {
      const media = [...(item.product_images || [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order).map((entry) => entry.url);
      const images = media.filter((entry) => !isVideoUrl(entry));
      const primaryBrand = brandMap.get(item.brand_id) || "Sem marca";
      const productBrands = [primaryBrand, ...(extraBrands.get(item.id) || []).map((id) => brandMap.get(id)).filter((name): name is string => Boolean(name) && name !== primaryBrand)];
      return { id: item.id, slug: item.slug, name: item.name, brand: primaryBrand, brands: productBrands, brandLogo: brandLogoMap.get(item.brand_id) || null, brandLogos: Object.fromEntries(productBrands.map((name) => { const brand = (brandsResult.data || []).find((candidate) => candidate.name === name); return [name, brand ? brand.logo_url as string | null : null]; })), category: categoryMap.get(item.categoria_id) || "Sem categoria", subcategory: subcategoryMap.get(item.subcategoria_id) || "Sem subcategoria", description: item.description || "", image: images[0] || "/hero-nord.png", images: images.length ? images : ["/hero-nord.png"], media: media.length ? media : ["/hero-nord.png"], active: true, rare: Boolean(item.rare), sought: Boolean(item.sought), price: item.price, showPrice: Boolean(item.show_price && item.price != null), createdAt: item.created_at };
    });
    return {
      products,
      brands: (brandsResult.data || []).map((item) => item.name),
      brandDetails: (brandsResult.data || []).map((item) => ({ id: item.id, name: item.name, slug: item.slug, logoUrl: item.logo_url as string | null })),
      categories: [...new Set((categoriesResult.data || []).map((item) => item.name))],
      settings: settingsResult.data ? { whatsapp: settingsResult.data.whatsapp, message: settingsResult.data.default_message } : fallbackSettings,
      configured: true,
    };
  } catch (error) { return unavailable(error instanceof Error ? error.message : "Falha ao carregar o catálogo."); }
}

function fallback(): StoreSnapshot { return { products: fallbackProducts, brands: fallbackBrands, brandDetails: fallbackBrands.map((name, index) => ({ id: String(index), name, slug: name.toLowerCase().replaceAll(" ", "-"), logoUrl: null })), categories: fallbackCategories, settings: fallbackSettings, configured: false }; }
function unavailable(error: string): StoreSnapshot { return { products: [], brands: [], brandDetails: [], categories: [], settings: fallbackSettings, configured: false, error }; }
