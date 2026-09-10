import { NextResponse } from "next/server";
import { getStoreSnapshot } from "@/lib/store-repository";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";
  if (q.length < 2) return NextResponse.json([]);
  const { products } = await getStoreSnapshot();
  return NextResponse.json(products.filter((product) => [product.name, product.brand, product.category, product.subcategory, product.description].join(" ").toLowerCase().includes(q)).slice(0, 12).map(({ id, slug, name, brand, category, image }) => ({ id, slug, name, brand, category, image })));
}
