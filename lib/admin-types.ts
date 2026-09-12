export type AdminBrand = { id: string; name: string; slug: string; logo_url: string | null };
export type AdminCategory = { id: string; brand_id: string; name: string; slug: string };
export type AdminSubcategory = { id: string; category_id: string; name: string; slug: string };
export type AdminImage = { id: string; url: string; storage_path: string | null; sort_order: number; is_cover: boolean };
export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string | null;
  brand_id: string | null;
  categoria_id: string | null;
  subcategoria_id: string | null;
  active: boolean;
  rare: boolean;
  sought: boolean;
  price: number | null;
  show_price: boolean;
  yupoo_album_url: string | null;
  created_at: string;
  product_images: AdminImage[];
};

export type ProductDraft = {
  name: string;
  slug: string;
  description: string;
  sku: string;
  brand_id: string;
  categoria_id: string;
  subcategoria_id: string;
  active: boolean;
  rare: boolean;
  sought: boolean;
  price: string;
  show_price: boolean;
};

export const emptyProductDraft: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  sku: "",
  brand_id: "",
  categoria_id: "",
  subcategoria_id: "",
  active: false,
  rare: false,
  sought: false,
  price: "",
  show_price: false,
};

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
