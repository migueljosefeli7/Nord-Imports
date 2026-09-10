import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = process.env.OPENAI_API_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supabaseUrl || !supabaseKey || !token) return NextResponse.json({ error: "Sessão ou Supabase não configurados." }, { status: 401 });
  if (!apiKey) return NextResponse.json({ error: "Cadastre OPENAI_API_KEY na Vercel para usar a renomeação inteligente." }, { status: 503 });
  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user } } = await supabase.auth.getUser(token);
  const { data: isAdmin } = await supabase.rpc("has_role", { requested_role: "admin" });
  if (!user || !isAdmin) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });

  try {
    const { products } = await request.json() as { products?: { id: string; name: string; description: string; sku: string | null }[] };
    if (!products?.length || products.length > 25) throw new Error("Selecione entre 1 e 25 produtos.");
    const endpoint = `${(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
    const aiResponse = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: "Você é especialista em sneakers e streetwear. Responda somente JSON válido, sem markdown. Para cada produto, preserve o id, extraia sku se estiver explícito, proponha o nome oficial/modelo/colorway sem inventar certeza e escreva uma descrição curta em português sobre história e legado. confidence deve ser high, medium ou low." }, { role: "user", content: JSON.stringify({ expected: { suggestions: [{ id: "string", name: "string", sku: "string|null", description: "string", confidence: "high|medium|low", reason: "string" }] }, products }) }] }) });
    if (!aiResponse.ok) throw new Error(`A IA respondeu com o status ${aiResponse.status}.`);
    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    const parsed = JSON.parse(String(content || "{}").replace(/^```json\s*|\s*```$/g, ""));
    if (!Array.isArray(parsed.suggestions)) throw new Error("A IA não retornou sugestões válidas.");
    return NextResponse.json({ suggestions: parsed.suggestions });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na análise." }, { status: 400 }); }
}
