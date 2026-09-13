import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { url, key } = getSupabaseBrowserConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !serviceKey) return NextResponse.json({ error: "Configuração administrativa do Supabase incompleta." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  const userClient = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sua sessão expirou. Faça login novamente." }, { status: 401 });
  const { data: isAdmin } = await userClient.rpc("has_role", { requested_role: "admin" });
  if (!isAdmin) return NextResponse.json({ error: "Apenas administradores podem alterar colaborações." }, { status: 403 });

  const body = await request.json() as { productId?: string; brandIds?: string[] };
  if (!body.productId || !Array.isArray(body.brandIds)) return NextResponse.json({ error: "Produto ou marcas inválidos." }, { status: 400 });
  const brandIds = [...new Set(body.brandIds.filter(Boolean))];
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const clear = await admin.from("product_brands").delete().eq("product_id", body.productId);
  if (clear.error) return NextResponse.json({ error: `Não foi possível limpar as colaborações: ${clear.error.message}` }, { status: 400 });
  if (brandIds.length) {
    const insert = await admin.from("product_brands").insert(brandIds.map((brandId) => ({ product_id: body.productId, brand_id: brandId })));
    if (insert.error) return NextResponse.json({ error: `Não foi possível salvar as marcas da colaboração: ${insert.error.message}` }, { status: 400 });
  }
  return NextResponse.json({ ok: true, count: brandIds.length });
}
