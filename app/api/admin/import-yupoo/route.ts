import { NextResponse } from "next/server";
import { getSupabaseBrowserConfig } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/admin-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ALBUMS = 30;

export async function POST(request: Request) {
  const { url, key } = getSupabaseBrowserConfig();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Sessão administrativa inválida." }, { status: 401 });

  const supabase = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });
  const { data: isAdmin } = await supabase.rpc("has_role", { requested_role: "admin" });
  if (!isAdmin) return NextResponse.json({ error: "Apenas administradores podem importar." }, { status: 403 });

  try {
    const body = await request.json() as { url?: string; urls?: string[]; brand_id?: string; categoria_id?: string; subcategoria_id?: string };
    const submitted = [...new Set((body.urls?.length ? body.urls : body.url?.split(/\s+/) || []).map((value) => value.trim()).filter(Boolean))];
    if (!submitted.length || !body.brand_id || !body.categoria_id || !body.subcategoria_id) throw new Error("Links e classificação são obrigatórios.");
    if (submitted.length > MAX_ALBUMS) throw new Error(`Envie no máximo ${MAX_ALBUMS} links por importação.`);

    const albumHtml = new Map<string, string>();
    const discovered: string[] = [];
    let sourceFailures = 0;
    for (const value of submitted) {
      try {
        const source = safeYupooUrl(value);
        const html = await fetchHtml(source);
        if (source.pathname.includes("/albums/")) {
          discovered.push(source.href);
          albumHtml.set(source.href, html);
        } else {
          const found = extractAlbumUrls(html, source);
          if (!found.length) sourceFailures += 1;
          discovered.push(...found);
        }
      } catch { sourceFailures += 1; }
    }
    const albumUrls = [...new Set(discovered)].slice(0, MAX_ALBUMS);
    if (!albumUrls.length) throw new Error("Nenhum álbum foi encontrado nos links informados.");
    const total = albumUrls.length + sourceFailures;

    const job = await supabase.from("import_jobs").insert({ user_id: user.id, source_url: albumUrls[0], status: "running", phase: "importando lote", total }).select("id").single();
    const jobId = job.data?.id as string | undefined;
    let created = 0; let duplicates = 0; let failures = sourceFailures;

    for (const albumUrl of albumUrls) {
      try {
        const existing = await supabase.from("products").select("id").eq("yupoo_album_url", albumUrl).maybeSingle();
        if (existing.data) { duplicates += 1; continue; }
        const html = albumHtml.get(albumUrl) || await fetchHtml(new URL(albumUrl));
        const title = extractMeta(html, "og:title") || extractTitle(html) || `Produto Yupoo ${albumUrl.split("/").filter(Boolean).pop()}`;
        const albumId = albumUrl.match(/\/albums\/(\d+)/)?.[1] || Date.now().toString();
        const product = await supabase.from("products").insert({ name: title, slug: `${slugify(title).slice(0, 70)}-${albumId}`, description: "Produto importado do Yupoo. Revise o nome, a descrição e publique quando estiver pronto.", brand_id: body.brand_id, categoria_id: body.categoria_id, subcategoria_id: body.subcategoria_id, yupoo_album_url: albumUrl, active: false }).select("id").single();
        if (product.error) throw product.error;
        const imageUrls = extractImageUrls(html);
        let savedImages = 0;
        for (let index = 0; index < imageUrls.length; index += 1) {
          try {
            const imageUrl = new URL(imageUrls[index]);
            if (!isSafeImageHost(imageUrl.hostname)) continue;
            const imageResponse = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: albumUrl }, signal: AbortSignal.timeout(15000) });
            if (!imageResponse.ok) continue;
            const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
            if (!contentType.startsWith("image/")) continue;
            const bytes = new Uint8Array(await imageResponse.arrayBuffer());
            if (bytes.byteLength < 8_000 || bytes.byteLength > 12_000_000) continue;
            const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            const path = `${product.data.id}/yupoo-${albumId}-${index}.${extension}`;
            const upload = await supabase.storage.from("products").upload(path, bytes, { contentType, upsert: true });
            if (upload.error) continue;
            const { data: publicData } = supabase.storage.from("products").getPublicUrl(path);
            const image = await supabase.from("product_images").insert({ product_id: product.data.id, url: publicData.publicUrl, storage_path: path, sort_order: savedImages, is_cover: savedImages === 0 });
            if (!image.error) savedImages += 1;
          } catch { /* One unavailable photo must not abort the album. */ }
        }
        created += 1;
      } catch { failures += 1; }
      if (jobId) await supabase.from("import_jobs").update({ created, duplicates, failures }).eq("id", jobId);
    }
    if (jobId) await supabase.from("import_jobs").update({ status: failures === total ? "failed" : "done", phase: "concluído", created, duplicates, failures }).eq("id", jobId);
    return NextResponse.json({ created, duplicates, failures, total });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível importar." }, { status: 400 });
  }
}

function safeYupooUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("URL do Yupoo inválida."); }
  if (url.protocol !== "https:" || !(url.hostname === "yupoo.com" || url.hostname.endsWith(".yupoo.com"))) throw new Error("Use uma URL HTTPS válida do Yupoo.");
  url.hash = "";
  return url;
}

async function fetchHtml(url: URL) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; NordImports/1.0)", Accept: "text/html" }, signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!response.ok) throw new Error(`O Yupoo respondeu com o status ${response.status}.`);
  return response.text();
}

function extractMeta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(html.match(new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"))?.[1] || "").trim();
}
function extractTitle(html: string) { return decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim(); }
function decodeHtml(value: string) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function extractAlbumUrls(html: string, base: URL) {
  const urls = [...html.matchAll(/href=["']([^"']*\/albums\/\d+[^"']*)["']/gi)].map((match) => new URL(decodeHtml(match[1]), base).href.split("?")[0]);
  return [...new Set(urls.filter((value) => { try { return safeYupooUrl(value).href; } catch { return false; } }))];
}
function extractImageUrls(html: string) {
  const normalized = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const meta = extractMeta(normalized, "og:image");
  const absolute = [...normalized.matchAll(/https?:\/\/[^"'<>\s\\]+/gi)].map((match) => match[0]);
  const protocolRelative = [...normalized.matchAll(/(?:src|data-src|data-origin-src|data-photo-url)=["'](\/\/[^"']+)["']/gi)].map((match) => `https:${match[1]}`);
  const candidates = [meta, ...protocolRelative, ...absolute].map((value) => decodeHtml(value).replace(/[),;]+$/, "")).filter(Boolean);
  const images = candidates.flatMap((value) => {
    try {
      const url = new URL(value);
      if (!isSafeImageHost(url.hostname)) return [];
      if (!/\.(jpe?g|png|webp)$/i.test(url.pathname)) return [];
      url.search = "";
      url.hash = "";
      url.pathname = url.pathname.replace(/\/(small|medium|thumb|square)\//i, "/big/");
      return [url.href];
    } catch { return []; }
  });
  return [...new Set(images)];
}
function isSafeImageHost(hostname: string) { return hostname === "yupoo.com" || hostname.endsWith(".yupoo.com"); }
