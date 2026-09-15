import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isYupooHost(hostname: string) {
  return hostname === "yupoo.com" || hostname.endsWith(".yupoo.com");
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const rawUrl = params.get("url") || "";
  const rawReferer = params.get("referer") || "";
  const suppliedSignature = params.get("signature") || "";
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || !/^[a-f0-9]{64}$/.test(suppliedSignature)) {
    return NextResponse.json({ error: "Miniatura não autorizada." }, { status: 401 });
  }

  let imageUrl: URL;
  let referer: URL;
  try {
    imageUrl = new URL(rawUrl);
    referer = new URL(rawReferer);
  } catch {
    return NextResponse.json({ error: "Endereço de miniatura inválido." }, { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || referer.protocol !== "https:" || !isYupooHost(imageUrl.hostname) || !isYupooHost(referer.hostname)) {
    return NextResponse.json({ error: "Origem de miniatura inválida." }, { status: 400 });
  }

  const expected = createHmac("sha256", secret).update(`${imageUrl.href}\n${referer.href}`).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(suppliedSignature))) {
    return NextResponse.json({ error: "Assinatura de miniatura inválida." }, { status: 401 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/jpeg,image/png,*/*",
        Referer: referer.href,
        "User-Agent": "Mozilla/5.0 (compatible; NordImports/1.0)",
      },
      signal: AbortSignal.timeout(15000),
      cache: "force-cache",
    });
    const contentType = (response.headers.get("content-type") || "").split(";")[0];
    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Miniatura indisponível." }, { status: 502 });
    }
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 8_000_000) {
      return NextResponse.json({ error: "Miniatura fora do limite." }, { status: 413 });
    }
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a miniatura." }, { status: 502 });
  }
}
