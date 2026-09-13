import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ProviderTrack = {
  description?: string;
  status?: string;
  origin?: string;
  destination?: string;
  date?: string;
  time?: string;
};

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("codigo")?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "Código de rastreio inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://rastro-correios-api.zeabur.app/api/v2/track/${encodeURIComponent(code)}`, {
      headers: { Accept: "application/json", "User-Agent": "NordImports/1.0" },
      signal: AbortSignal.timeout(15000),
      next: { revalidate: 900 },
    });
    const payload = await response.json().catch(() => null) as { data?: { code?: string; type?: string; tracks?: ProviderTrack[] }; error?: string; message?: string } | null;
    if (response.status === 404 || !payload?.data?.tracks?.length) {
      return NextResponse.json({ error: "Ainda não encontramos movimentações para este código. Confira o código ou tente novamente mais tarde." }, { status: 404 });
    }
    if (!response.ok) throw new Error(payload?.error || payload?.message || "Falha no serviço de rastreamento.");

    const events = payload.data.tracks.map((event, index) => ({
      id: `${event.date || ""}-${event.time || ""}-${index}`,
      description: event.description || "Atualização da encomenda",
      status: event.status || "in_transit",
      origin: event.origin || null,
      destination: event.destination || null,
      date: event.date || null,
      time: event.time || null,
    }));
    return NextResponse.json({ code: payload.data.code || code, type: payload.data.type || "Encomenda Correios", events, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "O rastreamento está temporariamente indisponível. Tente novamente em alguns minutos." }, { status: 503 });
  }
}
