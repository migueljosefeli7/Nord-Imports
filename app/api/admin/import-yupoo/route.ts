import { NextResponse } from "next/server";
import { getSupabaseBrowserConfig } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/admin-types";
import { createHash } from "node:crypto";
import sharp from "sharp";

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
        const savedHashes = new Set<string>();
        const savedSourceKeys = new Set<string>();
        const savedFingerprints: Uint8Array[] = [];
        for (let index = 0; index < imageUrls.length; index += 1) {
          try {
            const imageUrl = new URL(imageUrls[index]);
            if (!isSafeImageHost(imageUrl.hostname)) continue;
            const sourceKey = imageSourceKey(imageUrl);
            if (savedSourceKeys.has(sourceKey)) continue;
            const imageResponse = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0", Referer: albumUrl }, signal: AbortSignal.timeout(15000) });
            if (!imageResponse.ok) continue;
            const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
            if (!contentType.startsWith("image/")) continue;
            const bytes = new Uint8Array(await imageResponse.arrayBuffer());
            if (bytes.byteLength < 25_000 || bytes.byteLength > 12_000_000) continue;
            const dimensions = readImageSize(bytes, contentType);
            if (!dimensions || Math.min(dimensions.width, dimensions.height) < 700 || dimensions.width * dimensions.height < 600_000) continue;
            const hash = createHash("sha256").update(bytes).digest("hex");
            if (savedHashes.has(hash)) continue;
            const fingerprint = await imageFingerprint(bytes);
            if (savedFingerprints.some((saved) => visuallyEqual(saved, fingerprint))) continue;
            savedSourceKeys.add(sourceKey);
            savedHashes.add(hash);
            savedFingerprints.push(fingerprint);
            const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
            const path = `${product.data.id}/yupoo-${albumId}-${hash.slice(0, 16)}.${extension}`;
            const upload = await supabase.storage.from("products").upload(path, bytes, { contentType, upsert: true });
            if (upload.error) continue;
            const { data: publicData } = supabase.storage.from("products").getPublicUrl(path);
            const image = await supabase.from("product_images").insert({ product_id: product.data.id, url: publicData.publicUrl, storage_path: path, sort_order: savedImages, is_cover: savedImages === 0 });
            if (!image.error) savedImages += 1;
          } catch { /* One unavailable photo must not abort the album. */ }
        }
        if (!savedImages) {
          await supabase.from("products").delete().eq("id", product.data.id);
          throw new Error("O álbum não possui fotos em alta resolução.");
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

function imageSourceKey(url: URL) {
  return url.pathname
    .toLowerCase()
    .replace(/\/(small|medium|thumb|thumbnail|square|big|large|original)\//g, "/")
    .replace(/[-_](small|medium|thumb|thumbnail|big|large|original)(?=\.[a-z]+$)/, "");
}

async function imageFingerprint(bytes: Uint8Array) {
  const normalized = await sharp(bytes)
    .rotate()
    .resize(16, 16, { fit: "fill" })
    .greyscale()
    .normalize()
    .raw()
    .toBuffer();
  return new Uint8Array(normalized);
}

function visuallyEqual(first: Uint8Array, second: Uint8Array) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference += Math.abs(first[index] - second[index]);
  return difference / first.length <= 5.5;
}

function readImageSize(bytes: Uint8Array, contentType: string): { width: number; height: number } | null {
  if (contentType.includes("png") && bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: readUint32(bytes, 16), height: readUint32(bytes, 20) };
  }
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
      }
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2) break;
      offset += length + 2;
    }
  }
  if (contentType.includes("webp") && bytes.length > 30) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
    if (chunk === "VP8L" && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
function readUint32(bytes: Uint8Array, offset: number) { return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0; }
