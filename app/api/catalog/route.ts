import { NextResponse } from "next/server";
import { getStoreSnapshot } from "@/lib/store-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getStoreSnapshot(), { headers: { "Cache-Control": "no-store" } });
}
