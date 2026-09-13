import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CainiaoEvent = {
  time?: number | string;
  desc?: string;
  standerdDesc?: string;
  actionCode?: string;
  group?: { nodeDesc?: string };
};

type CainiaoModule = {
  mailNo?: string;
  originCountry?: string;
  destCountry?: string;
  status?: string;
  detailList?: CainiaoEvent[];
};

type TrackingEvent = {
  id: string;
  description: string;
  status: string;
  origin: string | null;
  destination: string | null;
  date: string | null;
  time: string | null;
};

function eventStatus(event: CainiaoEvent, fallback?: string) {
  const text = `${event.actionCode || ""} ${event.desc || ""} ${event.standerdDesc || ""} ${fallback || ""}`.toLowerCase();
  if (/deliver(ed|y)|entregue|signed/.test(text)) return "delivered";
  if (/out.for.delivery|saiu.*entrega|delivery.route/.test(text)) return "delivery_route";
  if (/accept|posted|postado|collected|pickup/.test(text)) return "posted";
  return "in_transit";
}

function eventDate(value?: number | string) {
  if (value == null) return { date: null, time: null };
  const parsed = typeof value === "number" ? new Date(value < 10_000_000_000 ? value * 1000 : value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: String(value), time: null };
  return {
    date: parsed.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    time: parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }),
  };
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("codigo")?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code)) {
    return NextResponse.json({ error: "Código de rastreio inválido." }, { status: 400 });
  }

  try {
    const url = new URL("https://global.cainiao.com/global/detail.json");
    url.searchParams.set("mailNos", code);
    url.searchParams.set("lang", "pt-BR");
    url.searchParams.set("language", "pt-BR");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 NordImports/1.0" },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Cainiao respondeu ${response.status}`);

    const payload = await response.json() as { success?: boolean; module?: CainiaoModule[] };
    const shipment = payload.module?.find((item) => item.mailNo?.toUpperCase() === code) || payload.module?.[0];
    if (!payload.success || !shipment?.mailNo) {
      return NextResponse.json({ error: "Código ainda não reconhecido pela transportadora internacional. Confira e tente novamente mais tarde." }, { status: 404 });
    }

    const events: TrackingEvent[] = [...(shipment.detailList || [])].reverse().map((event, index) => {
      const when = eventDate(event.time);
      return { id: `${event.time || "evento"}-${index}`, description: event.standerdDesc || event.desc || "Atualização da encomenda", status: eventStatus(event, shipment.status), origin: event.group?.nodeDesc || null, destination: null, date: when.date, time: when.time };
    });
    if (!events.length) events.push({ id: "awaiting-first-event", description: "Código reconhecido — aguardando a primeira movimentação da transportadora", status: "posted", origin: shipment.originCountry || "Origem internacional", destination: shipment.destCountry || "Brasil", date: null, time: null });

    return NextResponse.json({ code: shipment.mailNo, type: shipment.originCountry ? `Remessa internacional · ${shipment.originCountry}` : "Remessa internacional", events, updatedAt: new Date().toISOString(), provider: "Cainiao Global" });
  } catch {
    return NextResponse.json(
      { error: "O rastreamento internacional está temporariamente indisponível. Aguarde um instante e tente novamente." },
      { status: 503, headers: { "Retry-After": "60" } },
    );
  }
}
