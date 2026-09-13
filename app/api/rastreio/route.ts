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

const PROVIDER_URL = "https://rastro-correios-api.zeabur.app/api/v2/track";

async function fetchTracking(code: string) {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${PROVIDER_URL}/${encodeURIComponent(code)}`, {
        headers: { Accept: "application/json", "User-Agent": "NordImports/1.0" },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      lastResponse = response;
      if (response.ok || response.status === 404 || response.status < 500) return response;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }

  return lastResponse;
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("codigo")?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "Código de rastreio inválido." }, { status: 400 });
  }

  try {
    const response = await fetchTracking(code);
    if (!response) throw new Error("Provedor indisponível.");
    const payload = await response.json().catch(() => null) as { data?: { code?: string; type?: string; tracks?: ProviderTrack[] }; error?: string; message?: string } | null;
    if (!response.ok && response.status !== 404) {
      throw new Error(payload?.error || payload?.message || `Falha no serviço de rastreamento (${response.status}).`);
    }
    if (response.status === 404 || !payload?.data?.tracks?.length) {
      return NextResponse.json({ error: "Ainda não encontramos movimentações para este código. Confira o código ou tente novamente mais tarde." }, { status: 404 });
    }

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
    return NextResponse.json(
      { error: "A consulta aos Correios está temporariamente indisponível. Aguarde alguns minutos e tente novamente — seu código continua salvo no campo." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}
